import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { portalUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { Resend } from "resend";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.passwordHash || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  await db
    .update(portalUsersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(portalUsersTable.id, user.id));

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Session invalid." });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// POST /api/auth/set-password  — used from invite email link
router.post("/auth/set-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    res
      .status(400)
      .json({ error: "Token and password (min 8 chars) are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.inviteToken, token))
    .limit(1);

  if (
    !user ||
    !user.inviteTokenExpiry ||
    user.inviteTokenExpiry < new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired invite link." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(portalUsersTable)
    .set({
      passwordHash,
      isActive: true,
      inviteToken: null,
      inviteTokenExpiry: null,
    })
    .where(eq(portalUsersTable.id, user.id));

  res.json({ ok: true });
});

export default router;
