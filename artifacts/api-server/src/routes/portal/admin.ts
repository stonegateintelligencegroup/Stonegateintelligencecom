import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import {
  portalUsersTable,
  portalCasesTable,
  portalDocumentsTable,
  portalMessagesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/auth";
import { Resend } from "resend";

const router = Router();
router.use(requireAdmin);

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Clients ──────────────────────────────────────────────────────────────────

// GET /api/portal/admin/clients
router.get("/clients", async (req: Request, res: Response) => {
  const clients = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.role, "client"))
    .orderBy(desc(portalUsersTable.createdAt));

  res.json(clients.map((c) => ({ id: c.id, name: c.name, email: c.email, isActive: c.isActive, createdAt: c.createdAt })));
});

// POST /api/portal/admin/clients — create client + send invite
router.post("/clients", async (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }

  const existing = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const inviteToken = randomBytes(32).toString("hex");
  const inviteTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const [newUser] = await db
    .insert(portalUsersTable)
    .values({
      name,
      email: email.toLowerCase().trim(),
      role: "client",
      isActive: false,
      inviteToken,
      inviteTokenExpiry,
    })
    .returning();

  const domain = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://stonegateintelligence.com";
  const inviteUrl = `${domain}/portal/invite/${inviteToken}`;

  await resend.emails.send({
    from: "Stonegate Intelligence Group <noreply@stonegateintelligence.com>",
    to: email,
    subject: "Your Stonegate Intelligence Client Portal Invitation",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px;">
        <h1 style="color: #c0392b; font-size: 24px; margin-bottom: 8px;">Stonegate Intelligence Group</h1>
        <p style="color: #888; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 32px;">Secure Client Portal</p>
        <p style="margin-bottom: 16px;">Dear ${name},</p>
        <p style="margin-bottom: 16px;">You have been granted access to the Stonegate Intelligence Group secure client portal. Please click the link below to set your password and access your account.</p>
        <p style="margin-bottom: 32px;"><strong>This invitation expires in 72 hours.</strong></p>
        <a href="${inviteUrl}" style="display: inline-block; background: #c0392b; color: #ffffff; padding: 14px 28px; text-decoration: none; font-family: sans-serif; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">Access Your Portal</a>
        <p style="margin-top: 32px; color: #666; font-size: 12px;">If you did not expect this invitation, please disregard this email.</p>
        <p style="color: #666; font-size: 12px;">Stonegate Intelligence Group LLC</p>
      </div>
    `,
    text: `You have been invited to the Stonegate Intelligence Group client portal. Set your password here: ${inviteUrl}\n\nThis link expires in 72 hours.`,
  });

  res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
});

// ── Cases ────────────────────────────────────────────────────────────────────

// GET /api/portal/admin/cases
router.get("/cases", async (req: Request, res: Response) => {
  const cases = await db
    .select({
      id: portalCasesTable.id,
      caseNumber: portalCasesTable.caseNumber,
      status: portalCasesTable.status,
      assignedInvestigator: portalCasesTable.assignedInvestigator,
      notes: portalCasesTable.notes,
      lastUpdate: portalCasesTable.lastUpdate,
      createdAt: portalCasesTable.createdAt,
      clientId: portalCasesTable.clientId,
      clientName: portalUsersTable.name,
      clientEmail: portalUsersTable.email,
    })
    .from(portalCasesTable)
    .leftJoin(portalUsersTable, eq(portalCasesTable.clientId, portalUsersTable.id))
    .orderBy(desc(portalCasesTable.createdAt));

  res.json(cases);
});

// POST /api/portal/admin/cases
router.post("/cases", async (req: Request, res: Response) => {
  const { clientId, caseNumber, status, assignedInvestigator, notes } = req.body;
  if (!clientId || !caseNumber) {
    res.status(400).json({ error: "clientId and caseNumber are required." });
    return;
  }

  const [newCase] = await db
    .insert(portalCasesTable)
    .values({
      clientId: Number(clientId),
      caseNumber,
      status: status ?? "pending",
      assignedInvestigator,
      notes,
    })
    .returning();

  res.status(201).json(newCase);
});

// PATCH /api/portal/admin/cases/:id
router.patch("/cases/:id", async (req: Request, res: Response) => {
  const { status, assignedInvestigator, notes } = req.body;

  const [updated] = await db
    .update(portalCasesTable)
    .set({
      ...(status !== undefined && { status }),
      ...(assignedInvestigator !== undefined && { assignedInvestigator }),
      ...(notes !== undefined && { notes }),
      lastUpdate: new Date(),
    })
    .where(eq(portalCasesTable.id, Number(req.params.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found." });
    return;
  }

  res.json(updated);
});

// ── Documents ─────────────────────────────────────────────────────────────────

// GET /api/portal/admin/documents/:caseId
router.get("/documents/:caseId", async (req: Request, res: Response) => {
  const docs = await db
    .select()
    .from(portalDocumentsTable)
    .where(eq(portalDocumentsTable.caseId, Number(req.params.caseId)))
    .orderBy(desc(portalDocumentsTable.createdAt));

  res.json(docs);
});

// POST /api/portal/admin/documents/:caseId — register a document after upload
router.post("/documents/:caseId", async (req: Request, res: Response) => {
  const { fileName, fileType, fileSize, objectPath } = req.body;
  if (!fileName || !objectPath) {
    res.status(400).json({ error: "fileName and objectPath are required." });
    return;
  }

  const [doc] = await db
    .insert(portalDocumentsTable)
    .values({
      caseId: Number(req.params.caseId),
      uploadedById: req.session.userId!,
      fileName,
      fileType: fileType ?? "application/octet-stream",
      fileSize: fileSize ? Number(fileSize) : null,
      objectPath,
      direction: "admin_share",
    })
    .returning();

  res.status(201).json(doc);
});

// ── Messages ─────────────────────────────────────────────────────────────────

// GET /api/portal/admin/messages/:caseId
router.get("/messages/:caseId", async (req: Request, res: Response) => {
  const msgs = await db
    .select({
      id: portalMessagesTable.id,
      content: portalMessagesTable.content,
      createdAt: portalMessagesTable.createdAt,
      readAt: portalMessagesTable.readAt,
      senderId: portalMessagesTable.senderId,
      senderName: portalUsersTable.name,
      senderRole: portalUsersTable.role,
    })
    .from(portalMessagesTable)
    .leftJoin(portalUsersTable, eq(portalMessagesTable.senderId, portalUsersTable.id))
    .where(eq(portalMessagesTable.caseId, Number(req.params.caseId)))
    .orderBy(portalMessagesTable.createdAt);

  res.json(msgs);
});

// POST /api/portal/admin/messages/:caseId
router.post("/messages/:caseId", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ error: "Message content is required." });
    return;
  }

  const [msg] = await db
    .insert(portalMessagesTable)
    .values({
      caseId: Number(req.params.caseId),
      senderId: req.session.userId!,
      content: content.trim(),
    })
    .returning();

  res.status(201).json(msg);
});

// DELETE /api/portal/admin/documents/:docId
router.delete("/documents/file/:docId", async (req: Request, res: Response) => {
  const [deleted] = await db
    .delete(portalDocumentsTable)
    .where(eq(portalDocumentsTable.id, Number(req.params.docId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Document not found." });
    return;
  }

  res.json({ ok: true });
});

export default router;
