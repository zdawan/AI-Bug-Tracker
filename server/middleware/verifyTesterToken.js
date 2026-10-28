import jwt from "jsonwebtoken";

export default function verifyTesterToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in.",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({
      message: "Invalid authentication token.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "ai-bug-tracker",
      audience: "tester",
    });

    if (decoded.role !== "tester" || !decoded.email) {
      return res.status(403).json({
        message: "Tester access required.",
      });
    }

    req.tester = {
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Your session has expired. Please log in again.",
    });
  }
}
