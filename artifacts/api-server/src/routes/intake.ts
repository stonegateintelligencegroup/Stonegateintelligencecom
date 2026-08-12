import { Router, type Request, type Response } from "express";
import { Resend } from "resend";
import { db, intakeSubmissionsTable, portalUsersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const WINDOW = 60 * 60 * 1000; // 1 hour
  const MAX = 3;
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (entry.count >= MAX) return false;
  entry.count += 1;
  return true;
}

// ── Email helpers ─────────────────────────────────────────────────────────────
const SERVICE_LABELS: Record<string, string> = {
  investigative: "Investigative services",
  intelligence: "Intelligence consulting",
  due_diligence: "Due diligence research",
  risk: "Risk assessment",
  background: "Background research",
  litigation: "Litigation support services",
  business_intel: "Business intelligence services",
  other: "Other consulting",
};

function buildNotificationEmail(sub: {
  id: number;
  fullName: string;
  clientType: string;
  email: string;
  phone: string;
  services: string;
  timeline: string;
  submittedAt: string;
  portalClientName?: string | null;
}): { html: string; text: string } {
  const serviceList = (() => {
    try {
      const arr: string[] = JSON.parse(sub.services);
      return arr.map(s => SERVICE_LABELS[s] ?? s).join(", ");
    } catch { return sub.services; }
  })();

  const clientTypeLabel: Record<string, string> = {
    individual: "Individual",
    attorney: "Attorney / Law Firm",
    business: "Company",
  };

  const timelineLabel: Record<string, string> = {
    urgent: "Urgent — within 48 hours",
    standard: "Standard — 1–2 weeks",
    flexible: "Flexible / no set deadline",
  };

  const adminUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/portal/admin/inquiries`
    : "https://stonegateintelligence.com/portal/admin/inquiries";

  const portalRow = sub.portalClientName
    ? `<tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;width:180px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Portal Client</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${sub.portalClientName} ✓</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e0e0e0;">
        <tr>
          <td style="background:#111111;padding:32px 40px;">
            <p style="margin:0;font-size:11px;letter-spacing:4px;color:#c0392b;text-transform:uppercase;font-family:Arial,sans-serif;">Stonegate Intelligence Group</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:normal;letter-spacing:1px;">New Client Intake Submission</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 16px;">
            <p style="margin:0 0 24px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
              A new client intake form has been submitted. Review the basic information below, then visit the admin portal to see the full submission.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-collapse:collapse;">
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;width:180px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Submission ID</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">#${sub.id}</td></tr>
              ${portalRow}
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Name</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${sub.fullName}</td></tr>
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Client Type</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${clientTypeLabel[sub.clientType] ?? sub.clientType}</td></tr>
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Email</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${sub.email}</td></tr>
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Phone</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${sub.phone}</td></tr>
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">Services Requested</td><td style="padding:10px 16px;color:#333;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:13px;">${serviceList}</td></tr>
              <tr><td style="padding:10px 16px;font-weight:600;color:#1a1a1a;font-family:Arial,sans-serif;font-size:13px;">Timeline</td><td style="padding:10px 16px;color:#333;font-family:Arial,sans-serif;font-size:13px;">${timelineLabel[sub.timeline] ?? sub.timeline}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 32px;">
            <a href="${adminUrl}" style="display:inline-block;background:#c0392b;color:#ffffff;padding:12px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Review Full Submission →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
              Submitted: ${sub.submittedAt}<br>
              Case details are not included in this notification. Log in to the admin portal to view the complete submission.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#111111;padding:16px 40px;">
            <p style="margin:0;font-size:11px;color:#666;font-family:Arial,sans-serif;">© Stonegate Intelligence Group LLC — Confidential</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `STONEGATE INTELLIGENCE GROUP — New Client Intake Submission
${"=".repeat(50)}

Submission ID:     #${sub.id}
${sub.portalClientName ? `Portal Client:     ${sub.portalClientName} ✓\n` : ""}Name:              ${sub.fullName}
Client Type:       ${clientTypeLabel[sub.clientType] ?? sub.clientType}
Email:             ${sub.email}
Phone:             ${sub.phone}
Services:          ${serviceList}
Timeline:          ${timelineLabel[sub.timeline] ?? sub.timeline}

Review the full submission at: ${adminUrl}

NOTE: Case details are not included in this notification for security reasons.
Log in to the admin portal to view the complete submission.

Submitted: ${sub.submittedAt}
Stonegate Intelligence Group LLC — Confidential`;

  return { html, text };
}

// ── POST /api/intake — public submission ──────────────────────────────────────
router.post("/intake", async (req: Request, res: Response): Promise<void> => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  // Rate limit
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many submissions. Please try again later." });
    return;
  }

  // Honeypot check (field must be empty; bots fill it)
  if (req.body._honey) {
    res.status(200).json({ id: 0, message: "Thank you for your submission." });
    return;
  }

  const {
    fullName, submissionDate, referredBy, mailingAddress,
    phone, email, preferredContact, bestTime, clientType,
    services, otherServiceDescription, engagementDetails,
    timeline, targetCompletionDate, engagementStructure,
    budgetRange, budgetNotes, acknowledged,
    electronicSignature, signatureDate,
  } = req.body;

  // Server-side validation
  const errs: Record<string, string> = {};
  if (!fullName?.trim()) errs.fullName = "Full name is required.";
  if (!submissionDate) errs.submissionDate = "Date is required.";
  if (!phone?.trim() || phone.replace(/\D/g, "").length < 10) errs.phone = "A valid phone number is required.";
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "A valid email address is required.";
  if (!preferredContact) errs.preferredContact = "Preferred contact method is required.";
  if (!clientType) errs.clientType = "Client type is required.";
  const serviceArr = (() => { try { return JSON.parse(services); } catch { return []; } })();
  if (!Array.isArray(serviceArr) || serviceArr.length === 0) errs.services = "At least one service must be selected.";
  if (!engagementDetails?.trim()) errs.engagementDetails = "Engagement details are required.";
  if (!timeline) errs.timeline = "Timeline is required.";
  if (!engagementStructure) errs.engagementStructure = "Engagement structure is required.";
  if (!acknowledged) errs.acknowledged = "You must acknowledge the terms.";
  if (!electronicSignature?.trim()) errs.electronicSignature = "Electronic signature is required.";
  if (!signatureDate) errs.signatureDate = "Signature date is required.";

  if (Object.keys(errs).length > 0) {
    res.status(400).json({ error: "Validation failed.", fields: errs });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Save to DB
  const [submission] = await db
    .insert(intakeSubmissionsTable)
    .values({
      fullName: fullName.trim(),
      submissionDate,
      referredBy: referredBy?.trim() || null,
      mailingAddress: mailingAddress?.trim() || null,
      phone: phone.trim(),
      email: normalizedEmail,
      preferredContact,
      bestTime: bestTime?.trim() || null,
      clientType,
      services: JSON.stringify(serviceArr),
      otherServiceDescription: otherServiceDescription?.trim() || null,
      engagementDetails: engagementDetails.trim(),
      timeline,
      targetCompletionDate: targetCompletionDate || null,
      engagementStructure,
      budgetRange: budgetRange || null,
      budgetNotes: budgetNotes?.trim() || null,
      acknowledged: !!acknowledged,
      electronicSignature: electronicSignature.trim(),
      signatureDate,
      status: "new_inquiry",
      ipAddress: ip,
    })
    .returning();

  req.log.info({ submissionId: submission.id }, "New intake submission saved");

  // Auto-link to portal user by email
  let portalClientName: string | null = null;
  try {
    const [portalUser] = await db
      .select({ id: portalUsersTable.id, name: portalUsersTable.name })
      .from(portalUsersTable)
      .where(eq(portalUsersTable.email, normalizedEmail))
      .limit(1);

    if (portalUser) {
      await db
        .update(intakeSubmissionsTable)
        .set({ portalUserId: portalUser.id })
        .where(eq(intakeSubmissionsTable.id, submission.id));
      portalClientName = portalUser.name;
      req.log.info({ submissionId: submission.id, portalUserId: portalUser.id }, "Intake linked to portal client");
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to auto-link intake to portal user");
  }

  // Send admin notification
  try {
    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "long",
      timeStyle: "short",
    });
    const { html, text } = buildNotificationEmail({
      id: submission.id,
      fullName: submission.fullName,
      clientType: submission.clientType,
      email: submission.email,
      phone: submission.phone,
      services: submission.services,
      timeline: submission.timeline,
      submittedAt,
      portalClientName,
    });
    await resend.emails.send({
      from: "Stonegate Intelligence Group <noreply@stonegateintelligence.com>",
      to: ["Monica.Morgado@stonegateintelligence.com"],
      replyTo: submission.email,
      subject: `New Intake Submission #${submission.id} — ${submission.fullName}${portalClientName ? " (Portal Client)" : ""}`,
      html,
      text,
    });
    req.log.info({ submissionId: submission.id }, "Admin notification sent");
  } catch (err) {
    req.log.error({ err }, "Failed to send admin notification for intake");
  }

  res.status(201).json({
    id: submission.id,
    message: "Your inquiry has been received.",
  });
});

// ── Admin routes (require admin session) ─────────────────────────────────────

// GET /api/portal/admin/inquiries — list all, optionally filtered by ?userId=
router.get("/portal/admin/inquiries", requireAdmin, async (req: Request, res: Response) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;

  let query = db
    .select({
      id: intakeSubmissionsTable.id,
      fullName: intakeSubmissionsTable.fullName,
      email: intakeSubmissionsTable.email,
      phone: intakeSubmissionsTable.phone,
      clientType: intakeSubmissionsTable.clientType,
      services: intakeSubmissionsTable.services,
      timeline: intakeSubmissionsTable.timeline,
      status: intakeSubmissionsTable.status,
      submissionDate: intakeSubmissionsTable.submissionDate,
      createdAt: intakeSubmissionsTable.createdAt,
      portalUserId: intakeSubmissionsTable.portalUserId,
      portalClientName: portalUsersTable.name,
    })
    .from(intakeSubmissionsTable)
    .leftJoin(portalUsersTable, eq(intakeSubmissionsTable.portalUserId, portalUsersTable.id))
    .orderBy(desc(intakeSubmissionsTable.createdAt));

  const results = userId
    ? (await query).filter(r => r.portalUserId === userId)
    : await query;

  res.json(results);
});

// GET /api/portal/admin/inquiries/:id — full detail
router.get("/portal/admin/inquiries/:id", requireAdmin, async (req: Request, res: Response) => {
  const results = await db
    .select({
      id: intakeSubmissionsTable.id,
      fullName: intakeSubmissionsTable.fullName,
      submissionDate: intakeSubmissionsTable.submissionDate,
      referredBy: intakeSubmissionsTable.referredBy,
      mailingAddress: intakeSubmissionsTable.mailingAddress,
      phone: intakeSubmissionsTable.phone,
      email: intakeSubmissionsTable.email,
      preferredContact: intakeSubmissionsTable.preferredContact,
      bestTime: intakeSubmissionsTable.bestTime,
      clientType: intakeSubmissionsTable.clientType,
      services: intakeSubmissionsTable.services,
      otherServiceDescription: intakeSubmissionsTable.otherServiceDescription,
      engagementDetails: intakeSubmissionsTable.engagementDetails,
      timeline: intakeSubmissionsTable.timeline,
      targetCompletionDate: intakeSubmissionsTable.targetCompletionDate,
      engagementStructure: intakeSubmissionsTable.engagementStructure,
      budgetRange: intakeSubmissionsTable.budgetRange,
      budgetNotes: intakeSubmissionsTable.budgetNotes,
      acknowledged: intakeSubmissionsTable.acknowledged,
      electronicSignature: intakeSubmissionsTable.electronicSignature,
      signatureDate: intakeSubmissionsTable.signatureDate,
      status: intakeSubmissionsTable.status,
      internalNotes: intakeSubmissionsTable.internalNotes,
      portalUserId: intakeSubmissionsTable.portalUserId,
      createdAt: intakeSubmissionsTable.createdAt,
      updatedAt: intakeSubmissionsTable.updatedAt,
      // Portal client info
      portalClientName: portalUsersTable.name,
      portalClientEmail: portalUsersTable.email,
    })
    .from(intakeSubmissionsTable)
    .leftJoin(portalUsersTable, eq(intakeSubmissionsTable.portalUserId, portalUsersTable.id))
    .where(eq(intakeSubmissionsTable.id, Number(req.params.id)))
    .limit(1);

  if (!results[0]) { res.status(404).json({ error: "Not found." }); return; }
  res.json(results[0]);
});

// DELETE /api/portal/admin/inquiries/:id — permanently remove a submission
router.delete("/portal/admin/inquiries/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(intakeSubmissionsTable)
    .where(eq(intakeSubmissionsTable.id, id))
    .returning({ id: intakeSubmissionsTable.id });
  if (!deleted[0]) { res.status(404).json({ error: "Not found." }); return; }
  req.log.info({ submissionId: id }, "Intake submission deleted by admin");
  res.status(200).json({ deleted: true, id });
});

// PATCH /api/portal/admin/inquiries/:id — update status / notes
router.patch("/portal/admin/inquiries/:id", requireAdmin, async (req: Request, res: Response) => {
  const { status, internalNotes } = req.body;
  const [updated] = await db
    .update(intakeSubmissionsTable)
    .set({
      ...(status !== undefined && { status }),
      ...(internalNotes !== undefined && { internalNotes }),
      updatedAt: new Date(),
    })
    .where(eq(intakeSubmissionsTable.id, Number(req.params.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found." }); return; }
  res.json(updated);
});

export default router;
