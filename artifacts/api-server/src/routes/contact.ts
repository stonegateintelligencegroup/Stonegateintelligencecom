import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { db, contactInquiriesTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Simple in-memory rate limiting per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // max 5 submissions per hour per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

function buildEmailHtml(fields: {
  fullName: string;
  email: string;
  phone: string;
  caseSummary: string;
  preferredContact?: string | null;
  bestTime?: string | null;
  submittedAt: string;
}): string {
  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr>
          <td style="padding:10px 16px;font-weight:600;color:#1a1a1a;white-space:nowrap;vertical-align:top;width:200px;border-bottom:1px solid #f0f0f0;">${label}</td>
          <td style="padding:10px 16px;color:#333;vertical-align:top;border-bottom:1px solid #f0f0f0;">${value.replace(/\n/g, "<br>")}</td>
        </tr>`
      : "";

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
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:normal;letter-spacing:1px;">New Website Inquiry</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 24px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
              A new consultation request was submitted through the Stonegate Intelligence Group website. Details are listed below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-collapse:collapse;">
              ${row("Full Name", fields.fullName)}
              ${row("Email Address", fields.email)}
              ${row("Phone Number", fields.phone)}
              ${row("Preferred Contact", fields.preferredContact)}
              ${row("Best Time to Reach", fields.bestTime)}
              ${row("Case Summary", fields.caseSummary)}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <p style="margin:0;font-size:12px;color:#999;font-family:Arial,sans-serif;line-height:1.6;">
              Submitted: ${fields.submittedAt}<br>
              This inquiry was submitted via the secure intake form at stonegateintelligence.com.
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

function buildEmailText(fields: {
  fullName: string;
  email: string;
  phone: string;
  caseSummary: string;
  preferredContact?: string | null;
  bestTime?: string | null;
  submittedAt: string;
}): string {
  const lines = [
    "STONEGATE INTELLIGENCE GROUP",
    "New Website Inquiry",
    "=".repeat(50),
    "",
    `Full Name:          ${fields.fullName}`,
    `Email Address:      ${fields.email}`,
    `Phone Number:       ${fields.phone}`,
  ];

  if (fields.preferredContact) {
    lines.push(`Preferred Contact:  ${fields.preferredContact}`);
  }
  if (fields.bestTime) {
    lines.push(`Best Time to Reach: ${fields.bestTime}`);
  }

  lines.push(
    "",
    "Case Summary:",
    "-".repeat(50),
    fields.caseSummary,
    "",
    "=".repeat(50),
    `Submitted: ${fields.submittedAt}`,
    "Submitted via the secure intake form at stonegateintelligence.com.",
    "",
    "Stonegate Intelligence Group LLC — Confidential"
  );

  return lines.join("\n");
}

router.post("/contact", async (req, res): Promise<void> => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip)) {
    res.status(429).json({
      error:
        "Too many requests. Please wait before submitting another inquiry.",
    });
    return;
  }

  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid contact form submission");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fullName, phone, email, caseSummary, preferredContact, bestTime } =
    parsed.data;

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }

  const [inquiry] = await db
    .insert(contactInquiriesTable)
    .values({
      fullName,
      phone,
      email,
      caseSummary,
      preferredContact: preferredContact ?? null,
      bestTime: bestTime ?? null,
    })
    .returning();

  req.log.info(
    { inquiryId: inquiry.id },
    "New contact inquiry saved to database"
  );

  // Send email notification if API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const submittedAt = new Date().toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "long",
        timeStyle: "short",
      });

      const emailFields = {
        fullName,
        email,
        phone,
        caseSummary,
        preferredContact,
        bestTime,
        submittedAt,
      };

      const { error: sendError } = await resend.emails.send({
        from: "Stonegate Intelligence Group <noreply@stonegateintelligence.com>",
        to: ["Monica.Morgado@stonegateintelligence.com"],
        replyTo: email,
        subject: `New Inquiry from ${fullName} — Stonegate Intelligence Group`,
        html: buildEmailHtml(emailFields),
        text: buildEmailText(emailFields),
      });

      if (sendError) {
        req.log.error({ sendError }, "Resend API returned an error");
      } else {
        req.log.info({ inquiryId: inquiry.id }, "Email notification sent");
      }
    } catch (err) {
      req.log.error({ err }, "Failed to send email notification");
    }
  } else {
    req.log.warn("RESEND_API_KEY not set — email notification skipped");
  }

  res.status(201).json({
    id: inquiry.id,
    message:
      "Thank you for contacting Stonegate Intelligence Group. Your request has been received and will be reviewed confidentially.",
  });
});

export default router;
