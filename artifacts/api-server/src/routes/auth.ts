import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { portalUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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
    .where(sql`lower(${portalUsersTable.email}) = ${email.toLowerCase().trim()}`)
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

// POST /api/auth/forgot-password
router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(sql`lower(${portalUsersTable.email}) = ${email.toLowerCase().trim()}`)
    .limit(1);

  // Always respond with success to prevent email enumeration
  if (!user || !user.isActive) {
    res.json({ ok: true });
    return;
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(portalUsersTable)
    .set({ inviteToken: resetToken, inviteTokenExpiry: resetTokenExpiry })
    .where(eq(portalUsersTable.id, user.id));

  const domain = process.env.PUBLIC_APP_URL ?? "https://stonegateintelligence.com";
  const resetUrl = `${domain}/portal/reset-password/${resetToken}`;

  await resend.emails.send({
    from: "Stonegate Intelligence Group <noreply@stonegateintelligence.com>",
    to: user.email,
    subject: "Reset your portal password",
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #e8e0d4;">
        <h2 style="font-size: 22px; font-weight: normal; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #888; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 32px;">Stonegate Intelligence Group</p>
        <p style="color: #ccc; font-size: 14px; line-height: 1.6;">We received a request to reset the password for your client portal account. Click the link below to choose a new password.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; font-family: sans-serif; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request a password reset, please disregard this email — your password will remain unchanged.</p>
      </div>
    `,
    text: `Reset your Stonegate Intelligence Group portal password here: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please disregard.`,
  });

  res.json({ ok: true });
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    res.status(400).json({ error: "Token and password (min 8 chars) are required." });
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
    res.status(400).json({ error: "Invalid or expired reset link." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(portalUsersTable)
    .set({
      passwordHash,
      inviteToken: null,
      inviteTokenExpiry: null,
    })
    .where(eq(portalUsersTable.id, user.id));

  res.json({ ok: true });
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
