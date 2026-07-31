import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  portalCasesTable,
  portalDocumentsTable,
  portalMessagesTable,
  portalUsersTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Case ─────────────────────────────────────────────────────────────────────

// GET /api/portal/client/case
router.get("/case", async (req: Request, res: Response) => {
  const [clientCase] = await db
    .select()
    .from(portalCasesTable)
    .where(eq(portalCasesTable.clientId, req.session.userId!))
    .limit(1);

  if (!clientCase) {
    res.status(404).json({ error: "No case assigned yet." });
    return;
  }

  res.json(clientCase);
});

// ── Documents ─────────────────────────────────────────────────────────────────

// GET /api/portal/client/documents — client sees their own case docs
router.get("/documents", async (req: Request, res: Response) => {
  const [clientCase] = await db
    .select()
    .from(portalCasesTable)
    .where(eq(portalCasesTable.clientId, req.session.userId!))
    .limit(1);

  if (!clientCase) {
    res.json([]);
    return;
  }

  const docs = await db
    .select()
    .from(portalDocumentsTable)
    .where(eq(portalDocumentsTable.caseId, clientCase.id))
    .orderBy(desc(portalDocumentsTable.createdAt));

  res.json(docs);
});

// POST /api/portal/client/documents — client uploads a document
router.post("/documents", async (req: Request, res: Response) => {
  const { fileName, fileType, fileSize, objectPath } = req.body;
  if (!fileName || !objectPath) {
    res.status(400).json({ error: "fileName and objectPath are required." });
    return;
  }

  const [clientCase] = await db
    .select()
    .from(portalCasesTable)
    .where(eq(portalCasesTable.clientId, req.session.userId!))
    .limit(1);

  if (!clientCase) {
    res.status(404).json({ error: "No case assigned yet." });
    return;
  }

  const [doc] = await db
    .insert(portalDocumentsTable)
    .values({
      caseId: clientCase.id,
      uploadedById: req.session.userId!,
      fileName,
      fileType: fileType ?? "application/octet-stream",
      fileSize: fileSize ? Number(fileSize) : null,
      objectPath,
      direction: "client_upload",
    })
    .returning();

  res.status(201).json(doc);
});

// ── Messages ─────────────────────────────────────────────────────────────────

// GET /api/portal/client/messages
router.get("/messages", async (req: Request, res: Response) => {
  const [clientCase] = await db
    .select()
    .from(portalCasesTable)
    .where(eq(portalCasesTable.clientId, req.session.userId!))
    .limit(1);

  if (!clientCase) {
    res.json([]);
    return;
  }

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
    .leftJoin(
      portalUsersTable,
      eq(portalMessagesTable.senderId, portalUsersTable.id)
    )
    .where(eq(portalMessagesTable.caseId, clientCase.id))
    .orderBy(portalMessagesTable.createdAt);

  // Mark unread messages from admin as read
  await db
    .update(portalMessagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(portalMessagesTable.caseId, clientCase.id),
        eq(portalMessagesTable.readAt, null as any)
      )
    );

  res.json(msgs);
});

// POST /api/portal/client/messages
router.post("/messages", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ error: "Message content is required." });
    return;
  }

  const [clientCase] = await db
    .select()
    .from(portalCasesTable)
    .where(eq(portalCasesTable.clientId, req.session.userId!))
    .limit(1);

  if (!clientCase) {
    res.status(404).json({ error: "No case assigned yet." });
    return;
  }

  const [msg] = await db
    .insert(portalMessagesTable)
    .values({
      caseId: clientCase.id,
      senderId: req.session.userId!,
      content: content.trim(),
    })
    .returning();

  res.status(201).json(msg);
});

export default router;
