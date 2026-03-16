import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "smartbuild-enterprise-bitcopper-2026";

export function signToken(payload: { userId: number; userRole: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; userRole: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: number; userRole: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido" });
  req.userId = payload.userId;
  req.userRole = payload.userRole;
  next();
}
