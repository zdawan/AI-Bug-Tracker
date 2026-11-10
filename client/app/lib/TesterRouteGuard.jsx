"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LogIn,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  AUTH_AUTHENTICATED_STATE,
  AUTH_ERROR_STATE,
  AUTH_LOADING_STATE,
  AUTH_OFFLINE_STATE,
  AUTH_SESSION_EXPIRED_STATE,
  useTesterAuth,
} from "./TesterAuthProvider";

const DEFAULT_LOGIN_PATH = "/tester/login";
const DEFAULT_FALLBACK_PATH = "/tester/url";
const RETURN_TO_PARAM = "returnTo";
const AUTH_REDIRECT_MARKER = "testerAuthRedirected";
const MAX_RETURN_TO_LENGTH = 1024;
const ROUTE_POLICY_VERSION = 1;
const REDIRECT_DELAY_MS = 120;
const AUTHENTICATED_STATES = new Set([
  AUTH_AUTHENTICATED_STATE,
  AUTH_OFFLINE_STATE,
]);

const DEFAULT_PUBLIC_ROUTES = [
  "/tester/login",
  "/tester/login/",
];

const ROUTE_LABELS = Object.freeze({
  "/tester/url": "Test URL",
  "/tester/url-bug-report": "URL bug report",
  "/tester/dashboard": "Tester dashboard",
  "/tester": "Tester workspace",
});

const ROUTE_ACCESS_COPY = Object.freeze({
  loadingTitle: "Checking your tester session",
  loadingDescription: "We are confirming your access before opening this workspace.",
  loginTitle: "Tester sign-in required",
  loginDescription: "Sign in with your tester email to continue to this workspace.",
  expiredTitle: "Your tester session expired",
  expiredDescription: "Sign in again to continue safely.",
  offlineTitle: "You are offline",
  offlineDescription: "Your saved session is available, but a fresh access check will wait for the connection.",
  errorTitle: "We could not confirm access",
  errorDescription: "Try checking your connection or sign in again.",
});

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizePath(value) {
  const path = String(value || "").trim();
  if (!path) return "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function isInternalPath(value) {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") && !/^\/\\/i.test(path);
}

function safeReturnTo(value, fallback = DEFAULT_FALLBACK_PATH) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > MAX_RETURN_TO_LENGTH) return fallback;
  if (!isInternalPath(candidate)) return fallback;
  if (candidate.includes("/tester/login")) return fallback;
  return candidate;
}

function encodeReturnTo(path) {
  return encodeURIComponent(safeReturnTo(path));
}

function createLoginPath(path, loginPath = DEFAULT_LOGIN_PATH) {
  const safePath = safeReturnTo(path);
  const separator = loginPath.includes("?") ? "&" : "?";
  return `${loginPath}${separator}${RETURN_TO_PARAM}=${encodeReturnTo(safePath)}`;
}

function getPathLabel(pathname) {
  const normalizedPath = normalizePath(pathname);
  if (ROUTE_LABELS[normalizedPath]) return ROUTE_LABELS[normalizedPath];
  if (normalizedPath.startsWith("/tester/dashboard")) return "Tester dashboard";
  if (normalizedPath.startsWith("/tester/url-bug-report")) return "URL bug report";
  if (normalizedPath.startsWith("/tester/url")) return "Test URL";
  return "Tester workspace";
}

function routeMatches(pathname, route) {
  const currentPath = normalizePath(pathname);
  const targetRoute = normalizePath(route);
  if (targetRoute.endsWith("/*")) {
    return currentPath.startsWith(targetRoute.slice(0, -2));
  }
  return currentPath === targetRoute;
}

function isPublicRoute(pathname, publicRoutes) {
  return publicRoutes.some((route) => {
    if (typeof route === "function") return Boolean(route(pathname));
    if (route instanceof RegExp) return route.test(pathname);
    return routeMatches(pathname, route);
  });
}

function getCurrentLocation(pathname, searchParams) {
  const path = normalizePath(pathname);
  const query = searchParams?.toString();
  return query ? `${path}?${query}` : path;
}

function getRedirectReason(auth, isPublic) {
  if (isPublic) return "public-route";
  if (!auth?.isHydrated || auth?.status === AUTH_LOADING_STATE) return "auth-loading";
  if (auth?.status === AUTH_SESSION_EXPIRED_STATE) return "session-expired";
  if (auth?.status === AUTH_ERROR_STATE) return "auth-error";
  if (!auth?.isAuthenticated) return "missing-session";
  return "none";
}

function createGuardEvent(type, details = {}) {
  return {
    type,
    timestamp: Date.now(),
    version: ROUTE_POLICY_VERSION,
    ...details,
  };
}

function useStableValue(value) {
  const ref = useRef(value);
  if (JSON.stringify(ref.current) !== JSON.stringify(value)) ref.current = value;
  return ref.current;
}

function useBrowserSearch() {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search || "");
  }, []);

  return search;
}

function LoadingPanel({ title, description, routeLabel }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f8f3ff] px-6 py-12"
      aria-busy="true"
      aria-live="polite"
    >
      <section
        className="w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl"
        aria-labelledby="tester-route-loading-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-700">
          <LoaderCircle className="animate-spin" size={26} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
          {routeLabel}
        </p>
        <h1 id="tester-route-loading-title" className="mt-3 text-2xl font-semibold text-slate-950">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mx-auto mt-6 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-600" />
        </div>
      </section>
    </main>
  );
}

function LoginRequiredPanel({
  title,
  description,
  routeLabel,
  onLogin,
  onBack,
  isExpired = false,
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f8f3ff] px-6 py-12"
      aria-live="assertive"
    >
      <section
        className="w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl"
        aria-labelledby="tester-route-login-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-700">
          {isExpired ? (
            <RefreshCw size={26} aria-hidden="true" />
          ) : (
            <LockKeyhole size={26} aria-hidden="true" />
          )}
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
          {routeLabel}
        </p>
        <h1 id="tester-route-login-title" className="mt-3 text-2xl font-semibold text-slate-950">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <LogIn size={17} aria-hidden="true" />
            Sign in
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Go back
          </button>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Access is limited to authorized tester accounts.
        </p>
      </section>
    </main>
  );
}

function OfflineAccessPanel({ routeLabel, onRetry, onLogin }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f8f3ff] px-6 py-12"
      aria-live="polite"
    >
      <section
        className="w-full max-w-md rounded-3xl border border-amber-200 bg-white/95 p-8 text-center shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl"
        aria-labelledby="tester-route-offline-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <WifiOff size={26} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {routeLabel}
        </p>
        <h1 id="tester-route-offline-title" className="mt-3 text-2xl font-semibold text-slate-950">
          {ROUTE_ACCESS_COPY.offlineTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          {ROUTE_ACCESS_COPY.offlineDescription}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Check again
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <LogIn size={17} aria-hidden="true" />
            Open sign in
          </button>
        </div>
      </section>
    </main>
  );
}

function AccessErrorPanel({ routeLabel, message, onRetry, onLogin }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f3ff] px-6 py-12" aria-live="assertive">
      <section
        className="w-full max-w-md rounded-3xl border border-rose-200 bg-white/95 p-8 text-center shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl"
        aria-labelledby="tester-route-error-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          {routeLabel}
        </p>
        <h1 id="tester-route-error-title" className="mt-3 text-2xl font-semibold text-slate-950">
          {ROUTE_ACCESS_COPY.errorTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          {message || ROUTE_ACCESS_COPY.errorDescription}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
          >
            <LogIn size={17} aria-hidden="true" />
            Sign in again
          </button>
        </div>
      </section>
    </main>
  );
}

export function TesterRouteGuard({
  children,
  publicRoutes = DEFAULT_PUBLIC_ROUTES,
  loginPath = DEFAULT_LOGIN_PATH,
  fallbackPath = DEFAULT_FALLBACK_PATH,
  allowOfflineSession = true,
  validateBeforeRender = false,
  loadingFallback = null,
  loginFallback = null,
  offlineFallback = null,
  errorFallback = null,
  onGuardEvent,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const browserSearch = useBrowserSearch();
  const auth = useTesterAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [hasCompletedCheck, setHasCompletedCheck] = useState(false);
  const redirectTimerRef = useRef(null);
  const lastRedirectRef = useRef("");
  const lastLocationRef = useRef("");
  const stablePublicRoutes = useStableValue(publicRoutes);

  const currentLocation = useMemo(
    () => `${normalizePath(pathname)}${browserSearch}`,
    [browserSearch, pathname],
  );
  const isPublic = useMemo(
    () => isPublicRoute(pathname, stablePublicRoutes),
    [pathname, stablePublicRoutes],
  );
  const routeLabel = useMemo(() => getPathLabel(pathname), [pathname]);
  const redirectReason = useMemo(
    () => getRedirectReason(auth, isPublic),
    [auth, isPublic],
  );

  const emitGuardEvent = useCallback(
    (type, details = {}) => {
      const event = createGuardEvent(type, {
        pathname: normalizePath(pathname),
        location: currentLocation,
        routeLabel,
        authStatus: auth.status,
        ...details,
      });
      onGuardEvent?.(event);
      return event;
    },
    [auth.status, currentLocation, onGuardEvent, pathname, routeLabel],
  );

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, []);

  const getSafeLoginDestination = useCallback(() => {
    if (isPublic) return loginPath;
    return createLoginPath(currentLocation, loginPath);
  }, [currentLocation, isPublic, loginPath]);

  const redirectToLogin = useCallback(
    (reason = "missing-session") => {
      const destination = getSafeLoginDestination();
      if (lastRedirectRef.current === destination) return;
      lastRedirectRef.current = destination;
      clearRedirectTimer();
      setRedirecting(true);
      emitGuardEvent("redirect-to-login", { reason, destination });
      redirectTimerRef.current = window.setTimeout(() => {
        router.replace(destination);
      }, REDIRECT_DELAY_MS);
    },
    [clearRedirectTimer, emitGuardEvent, getSafeLoginDestination, router],
  );

  const redirectToFallback = useCallback(() => {
    const destination = safeReturnTo(fallbackPath, DEFAULT_FALLBACK_PATH);
    clearRedirectTimer();
    setRedirecting(true);
    emitGuardEvent("redirect-to-fallback", { destination });
    router.replace(destination);
  }, [clearRedirectTimer, emitGuardEvent, fallbackPath, router]);

  const retryAccessCheck = useCallback(() => {
    setHasCompletedCheck(false);
    emitGuardEvent("retry-access-check");
    return auth.refreshSession({ reason: "route-guard-retry" });
  }, [auth, emitGuardEvent]);

  const openLogin = useCallback(() => {
    redirectToLogin("manual-login-action");
  }, [redirectToLogin]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    redirectToFallback();
  }, [redirectToFallback, router]);

  useEffect(() => {
    lastLocationRef.current = currentLocation;
    setRedirecting(false);
    lastRedirectRef.current = "";
  }, [currentLocation]);

  useEffect(() => {
    return () => clearRedirectTimer();
  }, [clearRedirectTimer]);

  useEffect(() => {
    if (isPublic) {
      setHasCompletedCheck(true);
      emitGuardEvent("public-route-allowed");
      return;
    }

    if (!auth.isHydrated || auth.status === AUTH_LOADING_STATE || auth.isChecking) {
      setHasCompletedCheck(false);
      emitGuardEvent("waiting-for-auth-state");
      return;
    }

    if (auth.isAuthenticated && AUTHENTICATED_STATES.has(auth.status)) {
      setHasCompletedCheck(true);
      emitGuardEvent("protected-route-allowed", {
        offline: auth.status === AUTH_OFFLINE_STATE,
      });
      return;
    }

    setHasCompletedCheck(true);
    redirectToLogin(redirectReason);
  }, [
    auth.isAuthenticated,
    auth.isChecking,
    auth.isHydrated,
    auth.status,
    currentLocation,
    emitGuardEvent,
    isPublic,
    redirectReason,
    redirectToLogin,
  ]);

  useEffect(() => {
    if (isPublic || !validateBeforeRender || !auth.isAuthenticated) return;
    let cancelled = false;

    auth
      .requireAuthentication({ reason: "before-route-render" })
      .then((result) => {
        if (cancelled) return;
        setHasCompletedCheck(Boolean(result?.ok || result?.offline));
        emitGuardEvent("pre-render-validation-finished", {
          ok: Boolean(result?.ok),
          offline: Boolean(result?.offline),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [auth, emitGuardEvent, isPublic, validateBeforeRender]);

  if (isPublic) return children;

  if (redirecting) {
    return loadingFallback || (
      <LoadingPanel
        title="Opening sign in"
        description="Taking you to the secure tester sign-in screen."
        routeLabel={routeLabel}
      />
    );
  }

  if (!auth.isHydrated || auth.status === AUTH_LOADING_STATE || auth.isChecking || !hasCompletedCheck) {
    return loadingFallback || (
      <LoadingPanel
        title={ROUTE_ACCESS_COPY.loadingTitle}
        description={ROUTE_ACCESS_COPY.loadingDescription}
        routeLabel={routeLabel}
      />
    );
  }

  if (auth.status === AUTH_OFFLINE_STATE && allowOfflineSession && auth.isAuthenticated) {
    return offlineFallback || (
      <OfflineAccessPanel
        routeLabel={routeLabel}
        onRetry={retryAccessCheck}
        onLogin={openLogin}
      />
    );
  }

  if (auth.status === AUTH_ERROR_STATE) {
    return errorFallback || (
      <AccessErrorPanel
        routeLabel={routeLabel}
        message={auth.error}
        onRetry={retryAccessCheck}
        onLogin={openLogin}
      />
    );
  }

  if (!auth.isAuthenticated || auth.status === AUTH_SESSION_EXPIRED_STATE) {
    return loginFallback || (
      <LoginRequiredPanel
        title={
          auth.status === AUTH_SESSION_EXPIRED_STATE
            ? ROUTE_ACCESS_COPY.expiredTitle
            : ROUTE_ACCESS_COPY.loginTitle
        }
        description={
          auth.status === AUTH_SESSION_EXPIRED_STATE
            ? ROUTE_ACCESS_COPY.expiredDescription
            : ROUTE_ACCESS_COPY.loginDescription
        }
        routeLabel={routeLabel}
        onLogin={openLogin}
        onBack={goBack}
        isExpired={auth.status === AUTH_SESSION_EXPIRED_STATE}
      />
    );
  }

  return children;
}

export function TesterProtectedContent({ children, ...props }) {
  return <TesterRouteGuard {...props}>{children}</TesterRouteGuard>;
}

export function TesterPublicContent({ children, publicRoutes = DEFAULT_PUBLIC_ROUTES, ...props }) {
  return (
    <TesterRouteGuard {...props} publicRoutes={publicRoutes}>
      {children}
    </TesterRouteGuard>
  );
}

export function TesterAccessLoading({ routeLabel = "Tester workspace" }) {
  return (
    <LoadingPanel
      title={ROUTE_ACCESS_COPY.loadingTitle}
      description={ROUTE_ACCESS_COPY.loadingDescription}
      routeLabel={routeLabel}
    />
  );
}

export function TesterAccessDenied({ onLogin, routeLabel = "Tester workspace" }) {
  return (
    <LoginRequiredPanel
      title={ROUTE_ACCESS_COPY.loginTitle}
      description={ROUTE_ACCESS_COPY.loginDescription}
      routeLabel={routeLabel}
      onLogin={onLogin || (() => {})}
      onBack={() => {}}
    />
  );
}

export function TesterOfflineAccess({ onRetry, onLogin, routeLabel = "Tester workspace" }) {
  return (
    <OfflineAccessPanel
      routeLabel={routeLabel}
      onRetry={onRetry || (() => {})}
      onLogin={onLogin || (() => {})}
    />
  );
}

export function TesterAccessError({ message, onRetry, onLogin, routeLabel = "Tester workspace" }) {
  return (
    <AccessErrorPanel
      message={message}
      routeLabel={routeLabel}
      onRetry={onRetry || (() => {})}
      onLogin={onLogin || (() => {})}
    />
  );
}

export function useTesterRouteAccess(options = {}) {
  const auth = useTesterAuth();
  const pathname = usePathname();
  const browserSearch = useBrowserSearch();
  const location = `${normalizePath(pathname)}${browserSearch}`;
  const publicRoutes = options.publicRoutes || DEFAULT_PUBLIC_ROUTES;
  const publicRoute = isPublicRoute(pathname, publicRoutes);
  const canAccess = publicRoute || (auth.isAuthenticated && AUTHENTICATED_STATES.has(auth.status));

  return {
    ...auth,
    pathname,
    location,
    routeLabel: getPathLabel(pathname),
    isPublicRoute: publicRoute,
    canAccess,
    requiresLogin: !publicRoute && !canAccess,
    loginDestination: createLoginPath(location, options.loginPath || DEFAULT_LOGIN_PATH),
    routePolicyVersion: ROUTE_POLICY_VERSION,
  };
}

export function isTesterPublicPath(pathname, publicRoutes = DEFAULT_PUBLIC_ROUTES) {
  return isPublicRoute(pathname, publicRoutes);
}

export function getTesterLoginPath(pathname, loginPath = DEFAULT_LOGIN_PATH) {
  return createLoginPath(pathname, loginPath);
}

export function getTesterRouteLabel(pathname) {
  return getPathLabel(pathname);
}

export function getTesterRoutePolicy() {
  return Object.freeze({
    version: ROUTE_POLICY_VERSION,
    loginPath: DEFAULT_LOGIN_PATH,
    fallbackPath: DEFAULT_FALLBACK_PATH,
    publicRoutes: [...DEFAULT_PUBLIC_ROUTES],
    authenticatedStates: [...AUTHENTICATED_STATES],
  });
}

export function isSafeTesterReturnPath(pathname) {
  return isInternalPath(pathname) && !String(pathname).includes("/tester/login");
}

export function buildTesterReturnPath(pathname, search = "") {
  const basePath = safeReturnTo(pathname);
  const query = String(search || "");
  return query ? `${basePath}${query.startsWith("?") ? query : `?${query}`}` : basePath;
}

export function getTesterAuthRedirectMarker() {
  return AUTH_REDIRECT_MARKER;
}

export function createTesterGuardEvent(type, details) {
  return createGuardEvent(type, details);
}

export {
  DEFAULT_FALLBACK_PATH,
  DEFAULT_LOGIN_PATH,
  DEFAULT_PUBLIC_ROUTES,
  ROUTE_POLICY_VERSION,
};

export default TesterRouteGuard;
