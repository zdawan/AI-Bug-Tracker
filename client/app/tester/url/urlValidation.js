export function isValidTesterWebUrl(parsedUrl) {
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return false;
  }

  const hostname = parsedUrl.hostname;
  if (hostname === "localhost") {
    return true;
  }

  if (!hostname.includes(".") || hostname.length > 253) {
    return false;
  }

  return hostname.split(".").every(
    (label) =>
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}
