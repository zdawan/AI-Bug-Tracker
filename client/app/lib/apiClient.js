/*
 * Shared browser API client for the bug tracker frontend.
 *
 * This module intentionally owns transport concerns only. Feature components
 * should decide what a successful response means, while this client handles
 * URL construction, headers, parsing, timeouts, cancellation, retries, and
 * consistent error objects.
 */

const DEFAULT_API_URL = "http://localhost:5000";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 350;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TOKEN_STORAGE_KEY = "testerToken";
const EMAIL_STORAGE_KEY = "testerEmail";
const API_VERSION_PREFIX = "/api";

export class ApiClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = details.status ?? 0;
    this.code = details.code ?? "API_REQUEST_FAILED";
    this.data = details.data ?? null;
    this.url = details.url ?? "";
    this.method = details.method ?? "GET";
    this.isAbort = Boolean(details.isAbort);
    this.isTimeout = Boolean(details.isTimeout);
    this.isNetworkError = Boolean(details.isNetworkError);
    this.requestId = details.requestId ?? "";
    this.cause = details.cause;
  }
}

export class ApiAbortError extends ApiClientError {
  constructor(message = "The request was cancelled.", details = {}) {
    super(message, {
      ...details,
      code: "REQUEST_ABORTED",
      isAbort: true,
    });
    this.name = "ApiAbortError";
  }
}

export class ApiTimeoutError extends ApiClientError {
  constructor(message = "The request took too long to complete.", details = {}) {
    super(message, {
      ...details,
      code: "REQUEST_TIMEOUT",
      isTimeout: true,
    });
    this.name = "ApiTimeoutError";
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype,
  );
}

function trimTrailingSlashes(value) {
  return String(value || "").replace(/\/+$/, "");
}

function trimLeadingSlashes(value) {
  return String(value || "").replace(/^\/+/, "");
}

function normalizePath(path) {
  const value = String(path || "").trim();
  if (!value) return "/";
  return `/${trimLeadingSlashes(value)}`;
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function readEnvironmentBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return DEFAULT_API_URL;
}

export function getApiBaseUrl(value = readEnvironmentBaseUrl()) {
  const source = String(value || DEFAULT_API_URL).trim();
  return trimTrailingSlashes(source) || DEFAULT_API_URL;
}

export function buildApiUrl(path, baseUrl = getApiBaseUrl()) {
  if (isAbsoluteUrl(path)) return path;

  const base = getApiBaseUrl(baseUrl);
  const normalizedPath = normalizePath(path);
  return `${base}${normalizedPath}`;
}

export function buildApiPath(path) {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === API_VERSION_PREFIX || normalizedPath.startsWith(`${API_VERSION_PREFIX}/`)) {
    return normalizedPath;
  }
  return `${API_VERSION_PREFIX}${normalizedPath}`;
}

export function buildApiEndpoint(path, baseUrl = getApiBaseUrl()) {
  return buildApiUrl(buildApiPath(path), baseUrl);
}

export function appendQueryParams(path, params = {}) {
  const source = String(path || "");
  const [rawPath, rawQuery = ""] = source.split("?");
  const search = new URLSearchParams(rawQuery);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          search.append(key, String(item));
        }
      });
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${rawPath}?${query}` : rawPath;
}

export function serializeQuery(params = {}) {
  return new URLSearchParams(
    Object.entries(params).reduce((result, [key, value]) => {
      if (value === undefined || value === null || value === "") return result;
      result[key] = Array.isArray(value) ? value.join(",") : value;
      return result;
    }, {}),
  ).toString();
}

export function normalizeApiPath(path) {
  return buildApiPath(path);
}

function canUseStorage(storage) {
  return Boolean(storage && typeof storage.getItem === "function");
}

export function getBrowserStorage(kind = "session") {
  if (!isBrowser()) return null;

  try {
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    return canUseStorage(storage) ? storage : null;
  } catch {
    return null;
  }
}

export function readStorageValue(key, kind = "session", fallback = "") {
  const storage = getBrowserStorage(kind);
  if (!storage) return fallback;

  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(key, value, kind = "session") {
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageValue(key, kind = "session") {
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getTesterToken() {
  return readStorageValue(TOKEN_STORAGE_KEY, "session", "");
}

export function getTesterEmail() {
  return readStorageValue(EMAIL_STORAGE_KEY, "session", "");
}

export function saveTesterSession({ token, email } = {}) {
  const savedToken = token ? writeStorageValue(TOKEN_STORAGE_KEY, token) : false;
  const savedEmail = email
    ? writeStorageValue(EMAIL_STORAGE_KEY, String(email).trim().toLowerCase())
    : false;
  return { savedToken, savedEmail };
}

export function clearTesterSession() {
  return {
    token: removeStorageValue(TOKEN_STORAGE_KEY),
    email: removeStorageValue(EMAIL_STORAGE_KEY),
  };
}

export function getStoredAuthToken() {
  return getTesterToken();
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    normalized[key] = String(value);
  });
  return normalized;
}

function mergeHeaders(...headerGroups) {
  return headerGroups.reduce(
    (result, headers) => ({ ...result, ...normalizeHeaders(headers) }),
    {},
  );
}

export function createRequestId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `web-${Date.now().toString(36)}-${randomPart}`;
}

export function isFormDataBody(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export function isBlobBody(body) {
  return typeof Blob !== "undefined" && body instanceof Blob;
}

export function isArrayBufferBody(body) {
  return typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer;
}

export function isUrlSearchParamsBody(body) {
  return typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
}

export function isBodyAlreadyEncoded(body) {
  return (
    isFormDataBody(body) ||
    isBlobBody(body) ||
    isArrayBufferBody(body) ||
    isUrlSearchParamsBody(body) ||
    typeof body === "string"
  );
}

export function encodeRequestBody(body, headers = {}) {
  if (body === undefined || body === null) return undefined;
  if (isBodyAlreadyEncoded(body)) return body;

  const normalizedHeaders = normalizeHeaders(headers);
  const contentType = Object.keys(normalizedHeaders).find(
    (key) => key.toLowerCase() === "content-type",
  );

  if (isPlainObject(body) || Array.isArray(body)) {
    if (contentType && !normalizedHeaders[contentType].includes("json")) {
      return body;
    }
    return JSON.stringify(body);
  }

  return body;
}

export function inferContentType(body) {
  if (body === undefined || body === null) return "";
  if (isFormDataBody(body)) return "";
  if (isBlobBody(body)) return body.type || "application/octet-stream";
  if (isUrlSearchParamsBody(body)) return "application/x-www-form-urlencoded;charset=UTF-8";
  if (isPlainObject(body) || Array.isArray(body)) return "application/json";
  if (typeof body === "string") return "text/plain;charset=UTF-8";
  return "";
}

export function createHeaders({ headers = {}, body, token, requestId } = {}) {
  const inferredContentType = inferContentType(body);
  const authToken = token === undefined ? getStoredAuthToken() : token;
  const result = mergeHeaders(
    { Accept: "application/json", "X-Client-Request-Id": requestId },
    inferredContentType ? { "Content-Type": inferredContentType } : {},
    authToken ? { Authorization: `Bearer ${authToken}` } : {},
    headers,
  );

  if (isFormDataBody(body)) {
    Object.keys(result).forEach((key) => {
      if (key.toLowerCase() === "content-type") delete result[key];
    });
  }

  return result;
}

function isAbortLike(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function isTimeoutLike(error) {
  return error?.name === "TimeoutError" || error?.code === "TIMEOUT_ERR";
}

function isNetworkLike(error) {
  return error instanceof TypeError || error?.name === "NetworkError";
}

function getResponseRequestId(response) {
  return (
    response?.headers?.get("x-request-id") ||
    response?.headers?.get("x-client-request-id") ||
    ""
  );
}

function getResponseContentType(response) {
  return response?.headers?.get("content-type") || "";
}

export async function parseResponseBody(response) {
  const contentType = getResponseContentType(response).toLowerCase();

  if (response.status === 204 || response.status === 205) return null;

  if (contentType.includes("application/json") || contentType.includes("+json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  if (contentType.startsWith("text/")) {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  try {
    return await response.blob();
  } catch {
    return null;
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (!data || typeof data !== "object") return fallback;

  const candidates = [data.message, data.error, data.detail, data.title];
  const message = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return message?.trim() || fallback;
}

export function createHttpError(response, data, context = {}) {
  const fallback = `Request failed with status ${response.status}.`;
  const message = getErrorMessage(data, fallback);
  return new ApiClientError(message, {
    status: response.status,
    code: data?.code || `HTTP_${response.status}`,
    data,
    url: context.url,
    method: context.method,
    requestId: getResponseRequestId(response) || context.requestId,
  });
}

export function normalizeRequestError(error, context = {}) {
  if (error instanceof ApiClientError) return error;

  if (isAbortLike(error)) {
    return new ApiAbortError("The request was cancelled.", {
      ...context,
      cause: error,
    });
  }

  if (isTimeoutLike(error)) {
    return new ApiTimeoutError("The request timed out.", {
      ...context,
      cause: error,
    });
  }

  if (isNetworkLike(error)) {
    return new ApiClientError(
      "The server could not be reached. Check your connection and try again.",
      {
        ...context,
        code: "NETWORK_ERROR",
        isNetworkError: true,
        cause: error,
      },
    );
  }

  return new ApiClientError(
    error?.message || "The request could not be completed.",
    { ...context, cause: error },
  );
}

export function isRetryableStatus(status, retryStatusCodes = DEFAULT_RETRY_STATUS_CODES) {
  return retryStatusCodes instanceof Set
    ? retryStatusCodes.has(status)
    : Array.isArray(retryStatusCodes) && retryStatusCodes.includes(status);
}

export function isRetryableError(error, options = {}) {
  if (!error || error.isAbort || error.isTimeout) return false;
  if (error.status) {
    return isRetryableStatus(
      error.status,
      options.retryStatusCodes || DEFAULT_RETRY_STATUS_CODES,
    );
  }
  return Boolean(error.isNetworkError);
}

export function calculateRetryDelay(attempt, options = {}) {
  const baseDelay = Number(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const maxDelay = Number(options.maxRetryDelayMs ?? 4000);
  const jitter = options.retryJitter === false ? 0 : Math.random() * 100;
  return Math.min(maxDelay, baseDelay * 2 ** Math.max(0, attempt - 1) + jitter);
}

export function sleep(milliseconds, signal) {
  if (!milliseconds || milliseconds <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new ApiAbortError());
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createTimeoutSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortExternal, { once: true });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortExternal);
    },
  };
}

function shouldUseCredentials(credentials) {
  return credentials !== undefined && credentials !== null;
}

function normalizeMethod(method = "GET") {
  return String(method).trim().toUpperCase() || "GET";
}

function normalizeRetries(value) {
  const retries = Number(value);
  if (!Number.isFinite(retries) || retries < 0) return DEFAULT_MAX_RETRIES;
  return Math.floor(retries);
}

function createRequestContext({ url, method, requestId }) {
  return { url, method, requestId };
}

export async function request(path, options = {}) {
  const method = normalizeMethod(options.method);
  const url = options.absoluteUrl
    ? buildApiUrl(path, options.baseUrl)
    : buildApiEndpoint(path, options.baseUrl);
  const requestId = options.requestId || createRequestId();
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const retries = normalizeRetries(options.retries);
  const signal = options.signal;
  const body = encodeRequestBody(options.body, options.headers);
  const headers = createHeaders({
    headers: options.headers,
    body,
    token: options.token,
    requestId,
  });
  const context = createRequestContext({ url, method, requestId });
  const fetchOptions = {
    method,
    headers,
    body,
    signal: undefined,
    credentials: shouldUseCredentials(options.credentials)
      ? options.credentials
      : "same-origin",
    cache: options.cache,
    mode: options.mode,
    redirect: options.redirect,
    referrerPolicy: options.referrerPolicy,
  };

  Object.keys(fetchOptions).forEach((key) => {
    if (fetchOptions[key] === undefined) delete fetchOptions[key];
  });

  let attempt = 0;

  while (true) {
    const timeout = createTimeoutSignal(timeoutMs, signal);
    fetchOptions.signal = timeout.signal;

    try {
      if (signal?.aborted) throw new ApiAbortError("The request was cancelled.", context);

      const response = await fetch(url, fetchOptions);
      const data = await parseResponseBody(response);
      timeout.cleanup();

      if (!response.ok) {
        throw createHttpError(response, data, context);
      }

      return {
        data,
        response,
        status: response.status,
        headers: response.headers,
        requestId: getResponseRequestId(response) || requestId,
      };
    } catch (error) {
      timeout.cleanup();
      const normalizedError = timeout.didTimeout()
        ? new ApiTimeoutError("The request timed out.", context)
        : normalizeRequestError(error, context);

      if (attempt >= retries || !isRetryableError(normalizedError, options)) {
        throw normalizedError;
      }

      attempt += 1;
      await sleep(calculateRetryDelay(attempt, options), signal);
    }
  }
}

export async function requestData(path, options = {}) {
  const result = await request(path, options);
  return result.data;
}

export function get(path, options = {}) {
  return requestData(path, { ...options, method: "GET" });
}

export function post(path, body, options = {}) {
  return requestData(path, { ...options, method: "POST", body });
}

export function put(path, body, options = {}) {
  return requestData(path, { ...options, method: "PUT", body });
}

export function patch(path, body, options = {}) {
  return requestData(path, { ...options, method: "PATCH", body });
}

export function del(path, options = {}) {
  return requestData(path, { ...options, method: "DELETE" });
}

export function head(path, options = {}) {
  return requestData(path, { ...options, method: "HEAD" });
}

export function options(path, options = {}) {
  return requestData(path, { ...options, method: "OPTIONS" });
}

export function postJson(path, body, options = {}) {
  return post(path, body, {
    ...options,
    headers: mergeHeaders({ "Content-Type": "application/json" }, options.headers),
  });
}

export function putJson(path, body, options = {}) {
  return put(path, body, {
    ...options,
    headers: mergeHeaders({ "Content-Type": "application/json" }, options.headers),
  });
}

export function patchJson(path, body, options = {}) {
  return patch(path, body, {
    ...options,
    headers: mergeHeaders({ "Content-Type": "application/json" }, options.headers),
  });
}

export function postForm(path, formData, options = {}) {
  return post(path, formData, {
    ...options,
    headers: Object.fromEntries(
      Object.entries(options.headers || {}).filter(
        ([key]) => key.toLowerCase() !== "content-type",
      ),
    ),
  });
}

export function getJson(path, options = {}) {
  return get(path, {
    ...options,
    headers: mergeHeaders({ Accept: "application/json" }, options.headers),
  });
}

export function withQuery(path, params) {
  return appendQueryParams(path, params);
}

export function createApiClient(defaults = {}) {
  const clientDefaults = { ...defaults };

  const withDefaults = (options = {}) => ({
    ...clientDefaults,
    ...options,
    headers: mergeHeaders(clientDefaults.headers, options.headers),
  });

  return {
    request: (path, options) => request(path, withDefaults(options)),
    requestData: (path, options) => requestData(path, withDefaults(options)),
    get: (path, options) => get(path, withDefaults(options)),
    getJson: (path, options) => getJson(path, withDefaults(options)),
    post: (path, body, options) => post(path, body, withDefaults(options)),
    postJson: (path, body, options) => postJson(path, body, withDefaults(options)),
    postForm: (path, body, options) => postForm(path, body, withDefaults(options)),
    put: (path, body, options) => put(path, body, withDefaults(options)),
    putJson: (path, body, options) => putJson(path, body, withDefaults(options)),
    patch: (path, body, options) => patch(path, body, withDefaults(options)),
    patchJson: (path, body, options) => patchJson(path, body, withDefaults(options)),
    del: (path, options) => del(path, withDefaults(options)),
    head: (path, options) => head(path, withDefaults(options)),
  };
}

export const apiClient = createApiClient({
  baseUrl: getApiBaseUrl(),
  timeoutMs: DEFAULT_TIMEOUT_MS,
  retries: DEFAULT_MAX_RETRIES,
});

export const testerApi = createApiClient({
  baseUrl: getApiBaseUrl(),
  timeoutMs: 15000,
  retries: 1,
});

export const API_ENDPOINTS = Object.freeze({
  testers: {
    sendOtp: "/testers/send-otp",
    verifyOtp: "/testers/verify-otp",
    me: "/testers/me",
  },
  bugs: {
    collection: "/bugs",
    byId: (id) => `/bugs/${encodeURIComponent(id)}`,
    resolve: (id) => `/bugs/${encodeURIComponent(id)}/resolve`,
    severity: (id) => `/bugs/${encodeURIComponent(id)}/severity`,
  },
  developers: {
    byEmail: (email) => `/developers/email/${encodeURIComponent(email)}`,
    byId: (id) => `/developers/${encodeURIComponent(id)}`,
    bugs: (id) => `/developers/${encodeURIComponent(id)}/bugs`,
  },
  ai: {
    analyze: "/ai/analyze",
  },
});

export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  if (error instanceof ApiClientError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isUnauthorizedError(error) {
  return error?.status === 401 || error?.status === 403;
}

export function isValidationError(error) {
  return error?.status === 400 || error?.status === 422;
}

export function isRateLimitError(error) {
  return error?.status === 429;
}

export function isServerError(error) {
  return Number(error?.status) >= 500;
}

export function isOfflineError(error) {
  return Boolean(error?.isNetworkError) || (isBrowser() && !navigator.onLine);
}

export function isCancelledError(error) {
  return Boolean(error?.isAbort);
}

export function createAbortController() {
  return new AbortController();
}

export function createRequestScope() {
  const controller = createAbortController();
  return {
    signal: controller.signal,
    cancel: (reason) => controller.abort(reason),
    controller,
  };
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeOtp(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function createJsonHeaders(headers = {}) {
  return mergeHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
  }, headers);
}

export function createAuthHeaders(token = getStoredAuthToken(), headers = {}) {
  return mergeHeaders(
    token ? { Authorization: `Bearer ${token}` } : {},
    headers,
  );
}

export function redactToken(value) {
  const token = String(value || "");
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export function redactEmail(value) {
  const email = normalizeEmail(value);
  const at = email.indexOf("@");
  if (at <= 0) return email ? "[redacted]" : "";
  const name = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${name.slice(0, 1)}${"*".repeat(Math.max(1, name.length - 1))}@${domain}`;
}

export function redactHeaders(headers = {}) {
  return Object.entries(headers).reduce((result, [key, value]) => {
    const lowerKey = key.toLowerCase();
    result[key] = lowerKey === "authorization" ? "Bearer [redacted]" : value;
    return result;
  }, {});
}

export function createRequestLogDetails({ method, url, headers, requestId } = {}) {
  return {
    method: normalizeMethod(method),
    url: String(url || ""),
    headers: redactHeaders(headers),
    requestId: String(requestId || ""),
  };
}

export function isSuccessfulStatus(status) {
  return Number(status) >= 200 && Number(status) < 300;
}

export function isEmptyResponse(data) {
  return data === null || data === undefined || data === "";
}

export function getDataMessage(data, fallback = "") {
  return getErrorMessage(data, fallback);
}

export function unwrapData(data, keys = []) {
  if (!data || typeof data !== "object") return data;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  }
  return data;
}

export function pickResponseMessage(data, fallback = "") {
  return getErrorMessage(data, fallback);
}

export function createClientConfig(options = {}) {
  return {
    baseUrl: getApiBaseUrl(options.baseUrl),
    timeoutMs: Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    retries: normalizeRetries(options.retries),
    retryDelayMs: Number(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS),
    maxRetryDelayMs: Number(options.maxRetryDelayMs ?? 4000),
    retryStatusCodes: options.retryStatusCodes || DEFAULT_RETRY_STATUS_CODES,
    credentials: options.credentials,
    headers: normalizeHeaders(options.headers),
  };
}

export function getDefaultApiConfig() {
  return createClientConfig();
}

export function getDefaultRequestOptions() {
  return {
    method: "GET",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_MAX_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  };
}

export function getRequestHeadersForDebug(options = {}) {
  const requestId = options.requestId || createRequestId();
  const body = encodeRequestBody(options.body, options.headers);
  return createRequestLogDetails({
    method: options.method,
    url: buildApiEndpoint(options.path || "/", options.baseUrl),
    headers: createHeaders({
      headers: options.headers,
      body,
      token: options.token,
      requestId,
    }),
    requestId,
  });
}

export function getConstants() {
  return Object.freeze({
    defaultApiUrl: DEFAULT_API_URL,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    defaultRetryDelayMs: DEFAULT_RETRY_DELAY_MS,
    defaultMaxRetries: DEFAULT_MAX_RETRIES,
    tokenStorageKey: TOKEN_STORAGE_KEY,
    emailStorageKey: EMAIL_STORAGE_KEY,
    apiVersionPrefix: API_VERSION_PREFIX,
  });
}

export default apiClient;
