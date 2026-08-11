import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const intakeSubmissionsTable = pgTable("intake_submissions", {
  id: serial("id").primaryKey(),
  // Section 1 — Client Info
  fullName: text("full_name").notNull(),
  submissionDate: text("submission_date").notNull(),
  referredBy: text("referred_by"),
  mailingAddress: text("mailing_address"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  preferredContact: text("preferred_contact").notNull(),
  bestTime: text("best_time"),
  clientType: text("client_type").notNull(), // 'individual' | 'attorney' | 'business'
  // Section 2 — Services (stored as JSON array string)
  services: text("services").notNull(),
  otherServiceDescription: text("other_service_description"),
  // Section 3 — Case Details
  engagementDetails: text("engagement_details").notNull(),
  // Section 4 — Timeline & Budget
  timeline: text("timeline").notNull(), // 'urgent' | 'standard' | 'flexible'
  targetCompletionDate: text("target_completion_date"),
  engagementStructure: text("engagement_structure").notNull(),
  budgetRange: text("budget_range"),
  budgetNotes: text("budget_notes"),
  // Section 5 — Acknowledgement
  acknowledged: boolean("acknowledged").notNull().default(false),
  electronicSignature: text("electronic_signature").notNull(),
  signatureDate: text("signature_date").notNull(),
  // Admin fields
  portalUserId: integer("portal_user_id"), // linked portal_users.id (set when email matches a client account)
  status: text("status").notNull().default("new_inquiry"),
  internalNotes: text("internal_notes"),
  ipAddress: text("ip_address"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IntakeSubmission = typeof intakeSubmissionsTable.$inferSelect;
export type InsertIntakeSubmission = typeof intakeSubmissionsTable.$inferInsert;
