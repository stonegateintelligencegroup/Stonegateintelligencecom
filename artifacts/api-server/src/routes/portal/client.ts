import { Router, Request, Response } from "express";
import { Resend } from "resend";
import { db } from "@workspace/db";
import {
  portalCasesTable,
  portalDocumentsTable,
  portalMessagesTable,
  portalUsersTable,
  portalCaseNotesTable,
  portalNoteFoldersTable,
  billingStatementsTable,
  billingStatementItemsTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";

const MONICA_EMAIL = "Monica.Morgado@stonegateintelligence.com";

function buildMessageAlertHtml(fields: {
  clientName: string;
  caseNumber: string;
  messagePreview: string;
  sentAt: string;
}): string {
  const preview =
    fields.messagePreview.length > 500
      ? fields.messagePreview.slice(0, 500) + "…"
      : fields.messagePreview;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e0e0e0;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:32px 40px;">
            <p style="margin:0;font-size:11px;letter-spacing:4px;color:#c0392b;text-transform:uppercase;font-family:Arial,sans-serif;">Stonegate Intelligence Group</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:normal;letter-spacing:1px;">New Secure Message</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 24px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
              A client has sent a new secure message through the client portal.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 16px;font-weight:600;color:#1a1a1a;white-space:nowrap;vertical-align:top;width:200px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">Client Name</td>
                <td style="padding:10px 16px;color:#333;vertical-align:top;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">${fields.clientName}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-weight:600;color:#1a1a1a;white-space:nowrap;vertical-align:top;width:200px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">Case Number</td>
                <td style="padding:10px 16px;color:#333;vertical-align:top;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;">${fields.caseNumber}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-weight:600;color:#1a1a1a;white-space:nowrap;vertical-align:top;width:200px;font-family:Arial,sans-serif;">Message</td>
                <td style="padding:10px 16px;color:#333;vertical-align:top;font-family:Arial,sans-serif;">${preview.replace(/\n/g, "<br>")}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <p style="margin:0;font-size:12px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
              Sent: ${fields.sentAt}<br>
              Log in to the admin portal to reply.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#111111;padding:16px 40px;">
            <p style="margin:0;font-size:11px;color:#666;font-family:Arial,sans-serif;">
              &copy; Stonegate Intelligence Group LLC &mdash; Confidential
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildMessageAlertText(fields: {
  clientName: string;
  caseNumber: string;
  messagePreview: string;
  sentAt: string;
}): string {
  const preview =
    fields.messagePreview.length > 500
      ? fields.messagePreview.slice(0, 500) + "…"
      : fields.messagePreview;

  return [
    "STONEGATE INTELLIGENCE GROUP",
    "New Secure Message",
    "=".repeat(50),
    "",
    `Client Name:  ${fields.clientName}`,
    `Case Number:  ${fields.caseNumber}`,
    "",
    "Message:",
    "-".repeat(50),
    preview,
    "",
    "=".repeat(50),
    `Sent: ${fields.sentAt}`,
    "Log in to the admin portal to reply.",
    "",
    "Stonegate Intelligence Group LLC — Confidential",
  ].join("\n");
}

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

  // Fetch the client's name for the email alert
  const [clientUser] = await db
    .select({ name: portalUsersTable.name })
    .from(portalUsersTable)
    .where(eq(portalUsersTable.id, req.session.userId!))
    .limit(1);

  const [msg] = await db
    .insert(portalMessagesTable)
    .values({
      caseId: clientCase.id,
      senderId: req.session.userId!,
      content: content.trim(),
    })
    .returning();

  res.status(201).json(msg);

  // Send email alert to Monica (fire-and-forget, do not block the response)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    req.log.error("RESEND_API_KEY is not configured — skipping message alert email");
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    const sentAt = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "long",
      timeStyle: "short",
    });

    const alertFields = {
      clientName: clientUser?.name ?? "Unknown Client",
      caseNumber: clientCase.caseNumber,
      messagePreview: content.trim(),
      sentAt,
    };

    const { error: sendError } = await resend.emails.send({
      from: "Stonegate Intelligence Group <noreply@stonegateintelligence.com>",
      to: [MONICA_EMAIL],
      subject: `New Message from ${alertFields.clientName} — Case ${alertFields.caseNumber}`,
      html: buildMessageAlertHtml(alertFields),
      text: buildMessageAlertText(alertFields),
    });

    if (sendError) {
      req.log.error({ sendError }, "Failed to send message alert email via Resend");
    } else {
      req.log.info({ caseId: clientCase.id, messageId: msg.id }, "Message alert email sent to Monica");
    }
  } catch (err) {
    req.log.error({ err }, "Unexpected error sending message alert email");
  }
});

// GET /api/portal/client/notes — notes in the "Client Notes" folder for the authenticated client's case
router.get("/notes", async (req: Request, res: Response) => {
  // Find this client's case
  const [clientCase] = await db
    .select({ id: portalCasesTable.id })
    .from(portalCasesTable)
    .where(eq(portalCasesTable.portalUserId, req.session.userId!))
    .limit(1);
  if (!clientCase) { res.json([]); return; }

  // Find the "Client Notes" folder
  const [folder] = await db
    .select({ id: portalNoteFoldersTable.id })
    .from(portalNoteFoldersTable)
    .where(
      and(
        eq(portalNoteFoldersTable.caseId, clientCase.id),
        eq(portalNoteFoldersTable.name, "Client Notes")
      )
    )
    .limit(1);
  if (!folder) { res.json([]); return; }

  // Return notes in that folder (title + content only — no internal metadata)
  const notes = await db
    .select({
      id: portalCaseNotesTable.id,
      title: portalCaseNotesTable.title,
      content: portalCaseNotesTable.content,
      updatedAt: portalCaseNotesTable.updatedAt,
    })
    .from(portalCaseNotesTable)
    .where(eq(portalCaseNotesTable.folderId, folder.id))
    .orderBy(desc(portalCaseNotesTable.updatedAt));

  res.json(notes);
});

// ── Billing Statements (client-facing) ───────────────────────────────────────
// SECURITY: Server enforces that portal_user_id = authenticated session user.
// Clients can NEVER access the internal Billable Hours data.

// GET /api/portal/client/statements
router.get("/statements", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized." }); return; }

  const rows = await db
    .select({
      id: billingStatementsTable.id,
      statementNumber: billingStatementsTable.statementNumber,
      billingPeriod: billingStatementsTable.billingPeriod,
      statementDate: billingStatementsTable.statementDate,
      dueDate: billingStatementsTable.dueDate,
      amountDue: billingStatementsTable.amountDue,
      status: billingStatementsTable.status,
    })
    .from(billingStatementsTable)
    .where(
      and(
        eq(billingStatementsTable.portalUserId, userId),
        eq(billingStatementsTable.status, "published")
        // In practice, also allow paid/partially_paid/overdue so client sees their history
      )
    )
    .orderBy(desc(billingStatementsTable.statementDate));

  // Also include paid/partially_paid/overdue statements (client should see full history)
  const allVisible = await db
    .select({
      id: billingStatementsTable.id,
      statementNumber: billingStatementsTable.statementNumber,
      billingPeriod: billingStatementsTable.billingPeriod,
      statementDate: billingStatementsTable.statementDate,
      dueDate: billingStatementsTable.dueDate,
      amountDue: billingStatementsTable.amountDue,
      status: billingStatementsTable.status,
    })
    .from(billingStatementsTable)
    .where(eq(billingStatementsTable.portalUserId, userId))
    .orderBy(desc(billingStatementsTable.statementDate));

  // Filter to only client-visible statuses (not draft or void)
  const visible = allVisible.filter(s =>
    ["published", "paid", "partially_paid", "overdue"].includes(s.status)
  );

  res.json(visible);
});

// GET /api/portal/client/statements/:id
router.get("/statements/:id", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized." }); return; }

  const id = Number(req.params.id);

  const [row] = await db
    .select({
      stmt: billingStatementsTable,
    })
    .from(billingStatementsTable)
    .where(eq(billingStatementsTable.id, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found." }); return; }

  // SECURITY: Enforce ownership — client can only see their own statement
  if (row.stmt.portalUserId !== userId) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  // SECURITY: Only published/paid/partially_paid/overdue statements are client-visible
  if (!["published", "paid", "partially_paid", "overdue"].includes(row.stmt.status)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  // Fetch line items — these are client-safe (no investigator names, no internal time entry data)
  const items = await db
    .select({
      id: billingStatementItemsTable.id,
      description: billingStatementItemsTable.description,
      servicePeriod: billingStatementItemsTable.servicePeriod,
      quantity: billingStatementItemsTable.quantity,
      rate: billingStatementItemsTable.rate,
      amount: billingStatementItemsTable.amount,
      showQuantity: billingStatementItemsTable.showQuantity,
      showRate: billingStatementItemsTable.showRate,
      sortOrder: billingStatementItemsTable.sortOrder,
      // NOTE: timeEntryIds is intentionally EXCLUDED from this response
    })
    .from(billingStatementItemsTable)
    .where(eq(billingStatementItemsTable.statementId, id))
    .orderBy(asc(billingStatementItemsTable.sortOrder), asc(billingStatementItemsTable.id));

  // Look up client name from billing_clients for display
  const { sql: sqlFn } = await import("drizzle-orm");
  const [clientInfo] = await db.execute(
    sqlFn`SELECT bc.name, bc.address, bc.billing_email FROM billing_clients bc WHERE bc.id = ${row.stmt.billingClientId} LIMIT 1`
  );

  res.json({
    id: row.stmt.id,
    statementNumber: row.stmt.statementNumber,
    billingPeriod: row.stmt.billingPeriod,
    billingPeriodStart: row.stmt.billingPeriodStart,
    billingPeriodEnd: row.stmt.billingPeriodEnd,
    statementDate: row.stmt.statementDate,
    dueDate: row.stmt.dueDate,
    previousBalance: row.stmt.previousBalance,
    currentCharges: row.stmt.currentCharges,
    paymentsCredits: row.stmt.paymentsCredits,
    amountDue: row.stmt.amountDue,
    retainerApplied: row.stmt.retainerApplied,
    remainingRetainer: row.stmt.remainingRetainer,
    status: row.stmt.status,
    // Client info from billing_clients
    clientName: (clientInfo as any)?.name ?? null,
    clientAddress: (clientInfo as any)?.address ?? null,
    clientEmail: (clientInfo as any)?.billing_email ?? null,
    // INTENTIONALLY OMITTED from client response:
    // - adminNotes (internal only)
    // - timeEntryIds on items (internal only)
    // - investigator names
    // - internal billing rates beyond what admin chose to show
    items,
  });
});

export default router;
