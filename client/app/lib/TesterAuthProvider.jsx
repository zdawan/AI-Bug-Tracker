"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  API_ENDPOINTS,
  clearTesterSession,
  getApiErrorMessage,
  getTesterEmail,
  getTesterToken,
  isCancelledError,
  isOfflineError,
  isUnauthorizedError,
  normalizeEmail,
  saveTesterSession,
  testerApi,
} from "./apiClient";

const SESSION_EVENT_NAME = "bug-tracker:tester-session";
const SESSION_STORAGE_EVENT_KEY = "testerToken";
const SESSION_EMAIL_KEY = "testerEmail";
const AUTH_STATE_VERSION = 1;
const DEFAULT_SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_WARNING_SECONDS = 5 * 60;
const DEFAULT_SESSION_STALE_AFTER_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_RETRIES = 1;
const SESSION_CHECK_REQUEST_TIMEOUT_MS = 10000;
const AUTH_LOADING_STATE = "loading";
const AUTH_AUTHENTICATED_STATE = "authenticated";
const AUTH_UNAUTHENTICATED_STATE = "unauthenticated";
const AUTH_ERROR_STATE = "error";
const AUTH_OFFLINE_STATE = "offline";
const AUTH_SESSION_EXPIRED_STATE = "session-expired";
const AUTH_EVENT_TYPES = Object.freeze({
  initialized: "initialized",
  restored: "restored",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  validationStarted: "validation-started",
  validationSucceeded: "validation-succeeded",
  validationFailed: "validation-failed",
  sessionExpired: "session-expired",
  sessionCleared: "session-cleared",
  signedOut: "signed-out",
  offline: "offline",
  online: "online",
  storageChanged: "storage-changed",
  tokenUpdated: "token-updated",
  userUpdated: "user-updated",
});

const TesterAuthContext = createContext(null);

function isBrowser() {
  return typeof window !== "undefined";
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function now() {
  return Date.now();
}

function createEventId() {
  return `auth-${now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeUser(value) {
  if (!isObject(value)) return null;

  const email = normalizeEmail(value.email || value.testerEmail || value.userEmail);
  const id = value.id || value._id || value.testerId || value.userId || "";

  return {
    ...value,
    id: safeString(id),
    email,
  };
}

function normalizeSessionPayload(value) {
  if (!isObject(value)) return null;

  const token = safeString(value.token).trim();
  const email = normalizeEmail(value.email);
  const user = normalizeUser(value.user);

  if (!token && !email && !user) return null;

  return {
    token,
    email: email || user?.email || "",
    user,
    issuedAt: safeNumber(value.issuedAt, 0),
    checkedAt: safeNumber(value.checkedAt, 0),
    expiresAt: safeNumber(value.expiresAt, 0),
    source: safeString(value.source, "unknown"),
    version: safeNumber(value.version, AUTH_STATE_VERSION),
  };
}

function decodeBase64Url(value) {
  if (!value) return "";

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;
    return atob(padded);
  } catch {
    return "";
  }
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  try {
    const decoded = decodeBase64Url(parts[1]);
    const parsed = JSON.parse(decoded);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getTokenExpiration(token) {
  const payload = decodeJwtPayload(token);
  const expiration = safeNumber(payload?.exp, 0);
  return expiration > 0 ? expiration * 1000 : 0;
}

function getTokenIssuedAt(token) {
  const payload = decodeJwtPayload(token);
  const issuedAt = safeNumber(payload?.iat, 0);
  return issuedAt > 0 ? issuedAt * 1000 : 0;
}

function getTokenEmail(token) {
  const payload = decodeJwtPayload(token);
  return normalizeEmail(payload?.email || payload?.sub || payload?.testerEmail);
}

function tokenLooksUsable(token) {
  return typeof token === "string" && token.trim().length > 0;
}

function tokenIsExpired(token, currentTime = now()) {
  const expiresAt = getTokenExpiration(token);
  return expiresAt > 0 && expiresAt <= currentTime;
}

function getTokenLifetime(token) {
  const issuedAt = getTokenIssuedAt(token);
  const expiresAt = getTokenExpiration(token);
  if (!issuedAt || !expiresAt || expiresAt <= issuedAt) return 0;
  return expiresAt - issuedAt;
}

function getSessionStatusFromState(state) {
  if (state === AUTH_AUTHENTICATED_STATE) return "ready";
  if (state === AUTH_LOADING_STATE) return "loading";
  if (state === AUTH_OFFLINE_STATE) return "offline";
  if (state === AUTH_SESSION_EXPIRED_STATE) return "expired";
  if (state === AUTH_ERROR_STATE) return "error";
  return "signed-out";
}

function readInitialSession() {
  const token = getTesterToken();
  const storedEmail = normalizeEmail(getTesterEmail());

  if (!tokenLooksUsable(token)) return null;

  const tokenEmail = getTokenEmail(token);
  return {
    token,
    email: storedEmail || tokenEmail,
    user: tokenEmail ? { email: tokenEmail } : null,
    issuedAt: getTokenIssuedAt(token),
    checkedAt: 0,
    expiresAt: getTokenExpiration(token),
    source: "session-storage",
    version: AUTH_STATE_VERSION,
  };
}

function createEmptyAuthState() {
  return {
    status: AUTH_UNAUTHENTICATED_STATE,
    session: null,
    user: null,
    token: "",
    email: "",
    error: "",
    errorCode: "",
    isHydrated: false,
    isChecking: false,
    isOnline: true,
    lastCheckedAt: 0,
    lastEventAt: 0,
    expiresAt: 0,
    secondsUntilExpiry: 0,
    sessionVersion: AUTH_STATE_VERSION,
  };
}

function createEvent(type, details = {}) {
  return {
    id: createEventId(),
    type,
    timestamp: now(),
    ...details,
  };
}

function getResponseUser(data) {
  if (!data || typeof data !== "object") return null;
  return normalizeUser(data.user || data.tester || data.account || data);
}

function getResponseToken(data, fallback = "") {
  if (!data || typeof data !== "object") return fallback;
  return safeString(data.token || data.accessToken || data.testerToken, fallback);
}

function getResponseEmail(data, fallback = "") {
  const user = getResponseUser(data);
  return normalizeEmail(data?.email || user?.email || fallback);
}

function getResponseExpiration(data, token = "") {
  const responseExpiration = safeNumber(
    data?.expiresAt || data?.expires_at || data?.expiration,
    0,
  );
  if (responseExpiration > 0) {
    return responseExpiration < 10000000000
      ? responseExpiration * 1000
      : responseExpiration;
  }
  return getTokenExpiration(token);
}

function getResponseMessage(data, fallback = "") {
  if (!data || typeof data !== "object") return fallback;
  return safeString(data.message || data.detail || data.error, fallback);
}

function mergeUser(previous, next) {
  if (!previous && !next) return null;
  return { ...(previous || {}), ...(next || {}) };
}

function buildSession({ token, email, user, source, checkedAt = now(), data } = {}) {
  const normalizedToken = safeString(token).trim();
  const normalizedUser = normalizeUser(user) || getResponseUser(data);
  const normalizedEmail = normalizeEmail(
    email || normalizedUser?.email || getResponseEmail(data) || getTokenEmail(normalizedToken),
  );

  if (!normalizedToken && !normalizedEmail && !normalizedUser) return null;

  return {
    token: normalizedToken,
    email: normalizedEmail,
    user: normalizedUser,
    issuedAt: getTokenIssuedAt(normalizedToken) || now(),
    checkedAt,
    expiresAt: getResponseExpiration(data, normalizedToken),
    source: source || "provider",
    version: AUTH_STATE_VERSION,
  };
}

function buildAuthenticatedState(session, details = {}) {
  const safeSession = normalizeSessionPayload(session);
  const token = safeSession?.token || "";
  const email = safeSession?.email || getTokenEmail(token);
  const expiresAt = safeSession?.expiresAt || getTokenExpiration(token);

  return {
    ...createEmptyAuthState(),
    status: AUTH_AUTHENTICATED_STATE,
    session: safeSession,
    user: safeSession?.user || (email ? { email } : null),
    token,
    email,
    error: "",
    errorCode: "",
    isHydrated: true,
    isChecking: false,
    isOnline: details.isOnline ?? true,
    lastCheckedAt: safeSession?.checkedAt || now(),
    lastEventAt: now(),
    expiresAt,
    secondsUntilExpiry: expiresAt
      ? Math.max(0, Math.ceil((expiresAt - now()) / 1000))
      : 0,
    sessionVersion: AUTH_STATE_VERSION,
  };
}

function buildUnauthenticatedState(details = {}) {
  return {
    ...createEmptyAuthState(),
    status: details.status || AUTH_UNAUTHENTICATED_STATE,
    error: safeString(details.error),
    errorCode: safeString(details.errorCode),
    isHydrated: true,
    isChecking: false,
    isOnline: details.isOnline ?? true,
    lastEventAt: now(),
    sessionVersion: AUTH_STATE_VERSION,
  };
}

function buildLoadingState(previous, details = {}) {
  return {
    ...(previous || createEmptyAuthState()),
    status: AUTH_LOADING_STATE,
    error: "",
    errorCode: "",
    isHydrated: details.isHydrated ?? previous?.isHydrated ?? false,
    isChecking: true,
    isOnline: details.isOnline ?? previous?.isOnline ?? true,
    lastEventAt: now(),
  };
}

function buildOfflineState(previous, message = "You are offline.") {
  return {
    ...(previous || createEmptyAuthState()),
    status: AUTH_OFFLINE_STATE,
    error: message,
    errorCode: "OFFLINE",
    isHydrated: true,
    isChecking: false,
    isOnline: false,
    lastEventAt: now(),
  };
}

function shouldValidateSession(session, options = {}) {
  if (!session?.token) return false;
  if (tokenIsExpired(session.token)) return true;

  const checkedAt = safeNumber(session.checkedAt, 0);
  const staleAfterMs = safeNumber(
    options.staleAfterMs,
    DEFAULT_SESSION_STALE_AFTER_MS,
  );
  return !checkedAt || now() - checkedAt >= staleAfterMs;
}

function shouldIgnoreStorageEvent(event) {
  return !event || ![SESSION_STORAGE_EVENT_KEY, SESSION_EMAIL_KEY].includes(event.key);
}

function getSessionChangeType(previous, next) {
  if (!previous && next) return AUTH_EVENT_TYPES.authenticated;
  if (previous && !next) return AUTH_EVENT_TYPES.unauthenticated;
  if (previous?.token !== next?.token) return AUTH_EVENT_TYPES.tokenUpdated;
  if (previous?.email !== next?.email || previous?.user?.id !== next?.user?.id) {
    return AUTH_EVENT_TYPES.userUpdated;
  }
  return AUTH_EVENT_TYPES.restored;
}

function createAuthError(error, fallback) {
  return {
    message: getApiErrorMessage(error, fallback),
    code: safeString(error?.code, "AUTH_ERROR"),
    status: safeNumber(error?.status, 0),
  };
}

export function TesterAuthProvider({
  children,
  validateOnMount = true,
  validateOnFocus = true,
  validateOnOnline = true,
  validationIntervalMs = DEFAULT_SESSION_CHECK_INTERVAL_MS,
  staleAfterMs = DEFAULT_SESSION_STALE_AFTER_MS,
  refreshRetries = DEFAULT_REFRESH_RETRIES,
  sessionWarningSeconds = DEFAULT_SESSION_WARNING_SECONDS,
  onAuthEvent,
}) {
  const initialSessionRef = useRef(null);
  const initialStateRef = useRef(null);
  const mountedRef = useRef(false);
  const requestRef = useRef(null);
  const validationPromiseRef = useRef(null);
  const lastValidationAtRef = useRef(0);
  const eventListenersRef = useRef(new Set());
  const previousSessionRef = useRef(null);
  const [authState, setAuthState] = useState(() => {
    const session = readInitialSession();
    initialSessionRef.current = session;
    const state = session ? buildAuthenticatedState(session) : createEmptyAuthState();
    initialStateRef.current = state;
    previousSessionRef.current = session;
    return state;
  });

  const emitEvent = useCallback(
    (type, details = {}) => {
      const event = createEvent(type, details);
      onAuthEvent?.(event);
      eventListenersRef.current.forEach((listener) => {
        try {
          listener(event);
        } catch {
          // A diagnostic listener must never interrupt authentication.
        }
      });
      return event;
    },
    [onAuthEvent],
  );

  const updateState = useCallback((nextStateOrUpdater) => {
    setAuthState((current) => {
      const nextState =
        typeof nextStateOrUpdater === "function"
          ? nextStateOrUpdater(current)
          : nextStateOrUpdater;
      return { ...nextState, lastEventAt: now() };
    });
  }, []);

  const readSession = useCallback(() => {
    const session = readInitialSession();
    previousSessionRef.current = session;
    return session;
  }, []);

  const persistSession = useCallback((session) => {
    if (!session?.token) return false;
    const result = saveTesterSession({ token: session.token, email: session.email });
    return result.savedToken;
  }, []);

  const clearSession = useCallback(
    (reason = "manual") => {
      clearTesterSession();
      requestRef.current?.abort();
      requestRef.current = null;
      validationPromiseRef.current = null;
      previousSessionRef.current = null;
      updateState(buildUnauthenticatedState({
        isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
      }));
      emitEvent(AUTH_EVENT_TYPES.sessionCleared, { reason });
      if (isBrowser()) {
        window.dispatchEvent(
          new CustomEvent(SESSION_EVENT_NAME, {
            detail: { type: AUTH_EVENT_TYPES.sessionCleared, reason },
          }),
        );
      }
      return true;
    },
    [emitEvent, updateState],
  );

  const setSession = useCallback(
    (payload = {}, options = {}) => {
      const session = buildSession({
        token: payload.token,
        email: payload.email,
        user: payload.user,
        source: options.source || "login",
        data: payload.data,
      });

      if (!session?.token) {
        const error = new Error("A valid authentication token is required.");
        updateState(buildUnauthenticatedState({
          error: error.message,
          errorCode: "TOKEN_MISSING",
        }));
        emitEvent(AUTH_EVENT_TYPES.validationFailed, {
          reason: "token-missing",
          error: error.message,
        });
        return { ok: false, error };
      }

      if (tokenIsExpired(session.token)) {
        clearSession("expired-token");
        return {
          ok: false,
          error: new Error("This authentication session has expired."),
        };
      }

      persistSession(session);
      previousSessionRef.current = session;
      updateState(buildAuthenticatedState(session));
      emitEvent(AUTH_EVENT_TYPES.authenticated, {
        source: session.source,
        email: session.email,
        expiresAt: session.expiresAt,
      });

      if (isBrowser()) {
        window.dispatchEvent(
          new CustomEvent(SESSION_EVENT_NAME, {
            detail: { type: AUTH_EVENT_TYPES.authenticated, session },
          }),
        );
      }

      return { ok: true, session };
    },
    [clearSession, emitEvent, persistSession, updateState],
  );

  const validateSession = useCallback(
    async (options = {}) => {
      if (validationPromiseRef.current && !options.forceNewRequest) {
        return validationPromiseRef.current;
      }

      const currentSession = readSession();
      if (!currentSession?.token) {
        updateState((current) =>
          buildUnauthenticatedState({ isOnline: current.isOnline }),
        );
        return { ok: false, authenticated: false, reason: "missing-token" };
      }

      if (tokenIsExpired(currentSession.token)) {
        clearSession("expired-before-validation");
        return { ok: false, authenticated: false, reason: "expired" };
      }

      if (!options.force && !shouldValidateSession(currentSession, { staleAfterMs })) {
        updateState(buildAuthenticatedState(currentSession));
        return { ok: true, authenticated: true, skipped: true, session: currentSession };
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        updateState((current) => buildOfflineState(
          current,
          "You are offline. Your session will be checked when you reconnect.",
        ));
        emitEvent(AUTH_EVENT_TYPES.offline, { reason: "validation-paused" });
        return { ok: false, authenticated: true, offline: true, session: currentSession };
      }

      const controller = new AbortController();
      requestRef.current?.abort();
      requestRef.current = controller;
      lastValidationAtRef.current = now();
      updateState((current) => buildLoadingState(current, { isHydrated: true }));
      emitEvent(AUTH_EVENT_TYPES.validationStarted, {
        reason: options.reason || "requested",
      });

      const promise = testerApi
        .getJson(API_ENDPOINTS.testers.me, {
          token: currentSession.token,
          signal: controller.signal,
          timeoutMs: SESSION_CHECK_REQUEST_TIMEOUT_MS,
          retries: options.retries ?? refreshRetries,
        })
        .then((data) => {
          const responseUser = getResponseUser(data);
          const session = buildSession({
            token: getResponseToken(data, currentSession.token),
            email: getResponseEmail(data, currentSession.email),
            user: mergeUser(currentSession.user, responseUser),
            source: "session-validation",
            checkedAt: now(),
            data,
          });

          if (!session?.token) {
            throw new Error("The server did not return a valid tester session.");
          }

          persistSession(session);
          previousSessionRef.current = session;
          updateState(buildAuthenticatedState(session));
          emitEvent(AUTH_EVENT_TYPES.validationSucceeded, {
            email: session.email,
            checkedAt: session.checkedAt,
          });
          return { ok: true, authenticated: true, session, data };
        })
        .catch((error) => {
          if (isCancelledError(error)) {
            return { ok: false, authenticated: Boolean(currentSession), cancelled: true };
          }

          if (isOfflineError(error)) {
            updateState((current) => buildOfflineState(
              current,
              "The tester session could not be checked while offline.",
            ));
            emitEvent(AUTH_EVENT_TYPES.offline, { reason: "validation-error" });
            return { ok: false, authenticated: true, offline: true, session: currentSession };
          }

          if (isUnauthorizedError(error)) {
            clearSession("server-rejected-session");
            emitEvent(AUTH_EVENT_TYPES.sessionExpired, {
              reason: "server-rejected-session",
            });
            return { ok: false, authenticated: false, reason: "unauthorized" };
          }

          const authError = createAuthError(
            error,
            "The tester session could not be verified.",
          );
          updateState((current) => ({
            ...current,
            status: AUTH_ERROR_STATE,
            error: authError.message,
            errorCode: authError.code,
            isChecking: false,
            isHydrated: true,
            lastEventAt: now(),
          }));
          emitEvent(AUTH_EVENT_TYPES.validationFailed, {
            reason: "request-failed",
            error: authError.message,
            code: authError.code,
          });
          return {
            ok: false,
            authenticated: true,
            reason: "validation-error",
            error: authError,
            session: currentSession,
          };
        })
        .finally(() => {
          if (requestRef.current === controller) requestRef.current = null;
          validationPromiseRef.current = null;
        });

      validationPromiseRef.current = promise;
      return promise;
    },
    [clearSession, emitEvent, persistSession, readSession, refreshRetries, staleAfterMs, updateState],
  );

  const refreshSession = useCallback(
    (options = {}) => validateSession({ ...options, force: true, reason: options.reason || "refresh" }),
    [validateSession],
  );

  const signOut = useCallback(
    (reason = "manual") => {
      const email = authState.email;
      clearSession(reason);
      emitEvent(AUTH_EVENT_TYPES.signedOut, { reason, email });
      return { ok: true };
    },
    [authState.email, clearSession, emitEvent],
  );

  const updateUser = useCallback(
    (userPatch = {}) => {
      updateState((current) => {
        const user = mergeUser(current.user, normalizeUser(userPatch));
        const session = current.session ? { ...current.session, user, email: user?.email || current.email } : current.session;
        return { ...current, user, session, email: user?.email || current.email };
      });
      emitEvent(AUTH_EVENT_TYPES.userUpdated, { user: userPatch });
    },
    [emitEvent, updateState],
  );

  const subscribe = useCallback((listener) => {
    if (typeof listener !== "function") return () => {};
    eventListenersRef.current.add(listener);
    return () => eventListenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => authState, [authState]);

  const clearError = useCallback(() => {
    updateState((current) => ({ ...current, error: "", errorCode: "" }));
  }, [updateState]);

  const requireAuthentication = useCallback(
    async (options = {}) => {
      if (authState.status === AUTH_AUTHENTICATED_STATE && !options.force) {
        return { ok: true, authenticated: true, session: authState.session };
      }
      return validateSession({ ...options, force: options.force ?? true, reason: "required" });
    },
    [authState.session, authState.status, validateSession],
  );

  useEffect(() => {
    mountedRef.current = true;
    const session = initialSessionRef.current;
    const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;

    updateState((current) => ({
      ...current,
      isHydrated: true,
      isOnline: browserOnline,
      status: session ? AUTH_AUTHENTICATED_STATE : AUTH_UNAUTHENTICATED_STATE,
      lastEventAt: now(),
    }));
    emitEvent(AUTH_EVENT_TYPES.initialized, {
      hasSession: Boolean(session),
      isOnline: browserOnline,
    });

    if (session && validateOnMount) {
      validateSession({ reason: "mount" });
    }

    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [emitEvent, updateState, validateOnMount, validateSession]);

  useEffect(() => {
    if (!isBrowser()) return undefined;

    const handleOnline = () => {
      updateState((current) => ({
        ...current,
        isOnline: true,
        status: current.session ? AUTH_AUTHENTICATED_STATE : current.status,
        error: "",
        errorCode: "",
      }));
      emitEvent(AUTH_EVENT_TYPES.online);
      if (validateOnOnline && getTesterToken()) {
        validateSession({ force: true, reason: "online" });
      }
    };

    const handleOffline = () => {
      updateState((current) => buildOfflineState(
        current,
        "You are offline. Session checks are paused until the connection returns.",
      ));
      emitEvent(AUTH_EVENT_TYPES.offline, { reason: "browser-offline" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [emitEvent, updateState, validateOnOnline, validateSession]);

  useEffect(() => {
    if (!isBrowser() || !validateOnFocus) return undefined;

    const handleFocus = () => {
      const session = readSession();
      if (session && shouldValidateSession(session, { staleAfterMs })) {
        validateSession({ reason: "window-focus" });
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [readSession, staleAfterMs, validateOnFocus, validateSession]);

  useEffect(() => {
    if (!validationIntervalMs || validationIntervalMs <= 0) return undefined;

    const timer = window.setInterval(() => {
      const session = readSession();
      if (!session || !shouldValidateSession(session, { staleAfterMs })) return;
      validateSession({ reason: "interval" });
    }, validationIntervalMs);

    return () => window.clearInterval(timer);
  }, [readSession, staleAfterMs, validateSession, validationIntervalMs]);

  useEffect(() => {
    if (!isBrowser()) return undefined;

    const handleStorage = (event) => {
      if (shouldIgnoreStorageEvent(event)) return;

      const nextSession = readSession();
      const previousSession = previousSessionRef.current;
      const eventType = getSessionChangeType(previousSession, nextSession);
      previousSessionRef.current = nextSession;

      if (nextSession) {
        updateState(buildAuthenticatedState(nextSession));
      } else {
        updateState(buildUnauthenticatedState({ isOnline: navigator.onLine }));
      }
      emitEvent(AUTH_EVENT_TYPES.storageChanged, {
        source: "storage-event",
        changeType: eventType,
      });
    };

    const handleCustomSessionEvent = (event) => {
      const nextSession = readSession();
      previousSessionRef.current = nextSession;
      if (nextSession) updateState(buildAuthenticatedState(nextSession));
      else updateState(buildUnauthenticatedState({ isOnline: navigator.onLine }));
      emitEvent(AUTH_EVENT_TYPES.storageChanged, {
        source: "custom-session-event",
        changeType: event.detail?.type || "unknown",
      });
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_EVENT_NAME, handleCustomSessionEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_EVENT_NAME, handleCustomSessionEvent);
    };
  }, [emitEvent, readSession, updateState]);

  useEffect(() => {
    if (!authState.expiresAt) return undefined;

    const updateExpiry = () => {
      const secondsUntilExpiry = Math.max(
        0,
        Math.ceil((authState.expiresAt - now()) / 1000),
      );

      if (secondsUntilExpiry === 0) {
        clearSession("token-expired");
        emitEvent(AUTH_EVENT_TYPES.sessionExpired, { reason: "local-expiry" });
        return;
      }

      updateState((current) => ({ ...current, secondsUntilExpiry }));
      if (secondsUntilExpiry <= sessionWarningSeconds) {
        emitEvent("session-warning", {
          secondsUntilExpiry,
          expiresAt: authState.expiresAt,
        });
      }
    };

    updateExpiry();
    const timer = window.setInterval(updateExpiry, 1000);
    return () => window.clearInterval(timer);
  }, [authState.expiresAt, clearSession, emitEvent, sessionWarningSeconds, updateState]);

  const value = useMemo(
    () => ({
      ...authState,
      authState,
      sessionStatus: getSessionStatusFromState(authState.status),
      isAuthenticated: authState.status === AUTH_AUTHENTICATED_STATE,
      isLoading: authState.status === AUTH_LOADING_STATE || authState.isChecking,
      isSessionExpired: authState.status === AUTH_SESSION_EXPIRED_STATE,
      session: authState.session,
      tester: authState.user,
      testerEmail: authState.email,
      testerToken: authState.token,
      sessionWarningSeconds,
      setSession,
      validateSession,
      refreshSession,
      requireAuthentication,
      signOut,
      logout: signOut,
      clearSession,
      updateUser,
      clearError,
      subscribe,
      getSnapshot,
      constants: {
        sessionEventName: SESSION_EVENT_NAME,
        stateVersion: AUTH_STATE_VERSION,
        authStates: {
          loading: AUTH_LOADING_STATE,
          authenticated: AUTH_AUTHENTICATED_STATE,
          unauthenticated: AUTH_UNAUTHENTICATED_STATE,
          error: AUTH_ERROR_STATE,
          offline: AUTH_OFFLINE_STATE,
          expired: AUTH_SESSION_EXPIRED_STATE,
        },
      },
    }),
    [
      authState,
      clearError,
      clearSession,
      getSnapshot,
      refreshSession,
      requireAuthentication,
      sessionWarningSeconds,
      setSession,
      signOut,
      subscribe,
      updateUser,
      validateSession,
    ],
  );

  return (
    <TesterAuthContext.Provider value={value}>
      {children}
    </TesterAuthContext.Provider>
  );
}

export function useTesterAuth() {
  const context = useContext(TesterAuthContext);
  if (!context) {
    throw new Error("useTesterAuth must be used inside TesterAuthProvider.");
  }
  return context;
}

export function useOptionalTesterAuth() {
  return useContext(TesterAuthContext);
}

export function useTesterSession() {
  const auth = useTesterAuth();
  return {
    session: auth.session,
    token: auth.testerToken,
    email: auth.testerEmail,
    user: auth.tester,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    expiresAt: auth.expiresAt,
    secondsUntilExpiry: auth.secondsUntilExpiry,
  };
}

export function useTesterAuthActions() {
  const auth = useTesterAuth();
  return {
    setSession: auth.setSession,
    validateSession: auth.validateSession,
    refreshSession: auth.refreshSession,
    requireAuthentication: auth.requireAuthentication,
    signOut: auth.signOut,
    logout: auth.logout,
    clearSession: auth.clearSession,
    updateUser: auth.updateUser,
    clearError: auth.clearError,
  };
}

export function AuthStatus({ className = "" }) {
  const auth = useOptionalTesterAuth();
  if (!auth) return null;

  const label = auth.isLoading
    ? "Checking session"
    : auth.isAuthenticated
      ? "Signed in"
      : auth.isOnline
        ? "Not signed in"
        : "Offline";

  return (
    <span
      className={className}
      data-auth-status={auth.sessionStatus}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

export function TesterAuthBoundary({
  children,
  fallback = null,
  loading = null,
  unauthenticated = null,
  error = null,
  offline = null,
  requireAuth = false,
}) {
  const auth = useOptionalTesterAuth();
  if (!auth) return requireAuth ? fallback : children;
  if (auth.isLoading && loading !== null) return loading;
  if (auth.status === AUTH_OFFLINE_STATE && offline !== null) return offline;
  if (auth.status === AUTH_ERROR_STATE && error !== null) return error;
  if (!auth.isAuthenticated && requireAuth) return unauthenticated ?? fallback;
  return children;
}

export function TesterSessionSummary({ className = "" }) {
  const auth = useOptionalTesterAuth();
  if (!auth) return null;

  return (
    <div className={className} data-session-summary>
      <span>{auth.testerEmail || "No tester email"}</span>
      <span>{auth.sessionStatus}</span>
      {auth.secondsUntilExpiry > 0 && (
        <span>{auth.secondsUntilExpiry}s remaining</span>
      )}
    </div>
  );
}

export function getAuthStateConstants() {
  return Object.freeze({
    loading: AUTH_LOADING_STATE,
    authenticated: AUTH_AUTHENTICATED_STATE,
    unauthenticated: AUTH_UNAUTHENTICATED_STATE,
    error: AUTH_ERROR_STATE,
    offline: AUTH_OFFLINE_STATE,
    expired: AUTH_SESSION_EXPIRED_STATE,
  });
}

export function getAuthEventConstants() {
  return AUTH_EVENT_TYPES;
}

export function isAuthReady(auth) {
  return Boolean(auth?.isHydrated && !auth?.isLoading);
}

export function hasTesterSession(auth) {
  return Boolean(auth?.isAuthenticated && auth?.testerToken);
}

export function getTesterIdentity(auth) {
  return {
    id: safeString(auth?.tester?.id),
    email: normalizeEmail(auth?.testerEmail || auth?.tester?.email),
  };
}

export function getSessionExpiryLabel(seconds) {
  const totalSeconds = Math.max(0, Math.floor(safeNumber(seconds, 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export function createSessionEvent(type, details) {
  return createEvent(type, details);
}

export {
  AUTH_ERROR_STATE,
  AUTH_AUTHENTICATED_STATE,
  AUTH_LOADING_STATE,
  AUTH_OFFLINE_STATE,
  AUTH_SESSION_EXPIRED_STATE,
  AUTH_UNAUTHENTICATED_STATE,
  SESSION_EVENT_NAME,
};

export default TesterAuthContext;
