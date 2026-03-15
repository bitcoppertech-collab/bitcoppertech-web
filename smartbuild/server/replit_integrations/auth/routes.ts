import type { Express } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {

  // GET usuario actual
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await authStorage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo usuario" });
    }
  });

  // POST login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json({ ok: true, user });
      });
    })(req, res, next);
  });

  // POST registro
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email y contraseña requeridos" });
      const existing = await authStorage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email ya registrado" });
      const hash = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      const user = await authStorage.upsertUser({ id, email, password: hash, firstName, lastName });
      // Seed demo project
      try {
        const { seedDemoProject } = await import("../../demo-seed");
        await seedDemoProject(id);
      } catch {}
      req.logIn(user, (err: any) => {
        if (err) return res.status(500).json({ message: "Error al iniciar sesión" });
        res.json({ ok: true, user });
      });
    } catch (error) {
      res.status(500).json({ message: "Error en registro" });
    }
  });

  // POST logout
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout(() => res.json({ ok: true }));
  });

  // GET logout (compatibilidad)
  app.get("/api/logout", (req: any, res) => {
    req.logout(() => res.redirect("/"));
  });
}
