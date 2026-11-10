import TesterRouteGuard from "../lib/TesterRouteGuard";

export default function TesterLayout({ children }) {
  return <TesterRouteGuard>{children}</TesterRouteGuard>;
}
