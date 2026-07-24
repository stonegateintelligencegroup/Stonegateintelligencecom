import { Router, type IRouter } from "express";
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
    { inquiryId: inquiry.id, email: "[redacted]" },
    "New contact inquiry received"
  );

  res.status(201).json({
    id: inquiry.id,
    message:
      "Thank you for contacting Stonegate Intelligence Group. Your request has been received and will be reviewed confidentially.",
  });
});

export default router;
