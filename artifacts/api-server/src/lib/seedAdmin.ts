import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { portalUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seedAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    logger.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed."
    );
    return;
  }

  const existing = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    logger.info({ email }, "Admin account already exists — skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(portalUsersTable).values({
    email,
    name,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  logger.info({ email }, "Admin account seeded successfully.");
}
