const DEFAULT_TESTER_RETURN_TO = "/tester/url";
const TESTER_LOGIN_PATH = "/tester/login";
const TESTER_ROOT_PATH = "/tester";

export function isTesterPath(pathname) {
  return (
    typeof pathname === "string" &&
    (pathname === TESTER_ROOT_PATH || pathname.startsWith(`${TESTER_ROOT_PATH}/`))
  );
}

export function isInternalPath(pathname) {
  return (
    typeof pathname === "string" &&
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    !pathname.includes("\\")
  );
}

export function isLoginPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith(TESTER_LOGIN_PATH);
}

export function isSafeTesterReturnTo(pathname) {
  return isInternalPath(pathname) && isTesterPath(pathname) && !isLoginPath(pathname);
}

export function sanitizeTesterReturnTo(pathname, fallback = DEFAULT_TESTER_RETURN_TO) {
  return isSafeTesterReturnTo(pathname) ? pathname : fallback;
}

export function readTesterReturnTo(search, fallback = DEFAULT_TESTER_RETURN_TO) {
  if (typeof search !== "string" || !search) return fallback;

  try {
    const requestedPath = new URLSearchParams(search).get("returnTo");
    return sanitizeTesterReturnTo(requestedPath, fallback);
  } catch {
    return fallback;
  }
}

export function getTesterReturnToFromLocation(location, fallback = DEFAULT_TESTER_RETURN_TO) {
  if (!location || typeof location.search !== "string") return fallback;
  return readTesterReturnTo(location.search, fallback);
}

export function getTesterDestinationName(pathname) {
  const safePath = sanitizeTesterReturnTo(pathname);
  const names = {
    "/tester": "Tester workspace",
    "/tester/url": "URL testing workspace",
    "/tester/url-bug-report": "URL bug report workspace",
  };

  if (names[safePath]) return names[safePath];

  return safePath
    .replace(/^\/tester\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[-_]+/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ") || names[DEFAULT_TESTER_RETURN_TO];
}

export function getTesterRedirectQuery(pathname) {
  const safePath = sanitizeTesterReturnTo(pathname);
  return `?returnTo=${encodeURIComponent(safePath)}`;
}

export function shouldPreserveTesterReturnTo(pathname) {
  return isSafeTesterReturnTo(pathname) && pathname !== TESTER_LOGIN_PATH;
}

export const TESTER_RETURN_DEFAULT = DEFAULT_TESTER_RETURN_TO;
export const TESTER_LOGIN_ROUTE = TESTER_LOGIN_PATH;
