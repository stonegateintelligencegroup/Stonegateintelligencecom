import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  numeric,
  date,
} from "drizzle-orm/pg-core";

// ── Billing Clients ───────────────────────────────────────────────────────────
// Separate from portal_users — billing clients are the financial/engagement
// contacts. They can optionally be linked to a portal user via linkedPortalUserId.

export const billingClientsTable = pgTable("billing_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                        // Individual or company name
  primaryContact: text("primary_contact"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  billingContact: text("billing_contact"),
  billingEmail: text("billing_email"),
  defaultRate: numeric("default_rate", { precision: 10, scale: 2 }), // $/hr
  paymentTerms: text("payment_terms"),                 // e.g. "Net 30"
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  linkedPortalUserId: integer("linked_portal_user_id"), // optional link to portal_users
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BillingClient = typeof billingClientsTable.$inferSelect;
export type InsertBillingClient = typeof billingClientsTable.$inferInsert;

// ── Billing Engagements ───────────────────────────────────────────────────────
// Cases / engagements under a billing client.

export const billingEngagementsTable = pgTable("billing_engagements", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => billingClientsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  caseType: text("case_type").notNull().default("Investigative Services"),
  // "Investigative Services" | "Intelligence Consulting" | "Due Diligence" |
  // "Risk Assessment" | "Background Research" | "Litigation Support" |
  // "Business Intelligence" | "Other Consulting"
  dateOpened: text("date_opened").notNull(),           // ISO date string
  targetCompletion: text("target_completion"),         // ISO date string, nullable
  assignedInvestigator: text("assigned_investigator"),
  billingStructure: text("billing_structure").notNull().default("hourly"),
  // "hourly" | "retainer" | "flat_fee" | "contingency"
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  retainerAmount: numeric("retainer_amount", { precision: 10, scale: 2 }),
  retainerStartDate: text("retainer_start_date"),      // ISO date string
  budget: numeric("budget", { precision: 10, scale: 2 }), // authorized budget
  status: text("status").notNull().default("open"),
  // "open" | "on_hold" | "completed" | "closed"
  notes: text("notes"),
  linkedPortalCaseId: integer("linked_portal_case_id"), // optional FK to portal_cases.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BillingEngagement = typeof billingEngagementsTable.$inferSelect;
export type InsertBillingEngagement = typeof billingEngagementsTable.$inferInsert;

// ── Time Entries ──────────────────────────────────────────────────────────────

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),                        // ISO date string YYYY-MM-DD
  startTime: text("start_time"),                       // HH:MM (24h), nullable if manual
  endTime: text("end_time"),                           // HH:MM (24h), nullable if manual
  durationMinutes: integer("duration_minutes").notNull(), // raw minutes before rounding
  billedMinutes: integer("billed_minutes").notNull(),  // rounded to billing increment
  billedHours: numeric("billed_hours", { precision: 6, scale: 2 }).notNull(),
  clientId: integer("client_id").notNull().references(() => billingClientsTable.id),
  engagementId: integer("engagement_id").references(() => billingEngagementsTable.id),
  investigator: text("investigator").notNull(),
  activityType: text("activity_type").notNull(),
  // "Research" | "Database Research" | "Public Records Research" | "Surveillance" |
  // "Interview" | "Background Investigation" | "Due Diligence" |
  // "Litigation Support" | "Report Preparation" | "Analysis" |
  // "Client Communication" | "Travel" | "Administrative" | "Consultation" | "Other"
  description: text("description"),
  billable: boolean("billable").notNull().default(true),
  billingRate: numeric("billing_rate", { precision: 10, scale: 2 }),
  billableAmount: numeric("billable_amount", { precision: 10, scale: 2 }),
  billingStatus: text("billing_status").notNull().default("unbilled"),
  // "unbilled" | "ready_to_invoice" | "invoiced" | "paid" | "written_off"
  internalNotes: text("internal_notes"),
  createdByUserId: integer("created_by_user_id"),     // portal_users.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TimeEntry = typeof timeEntriesTable.$inferSelect;
export type InsertTimeEntry = typeof timeEntriesTable.$inferInsert;

// ── Invoices ──────────────────────────────────────────────────────────────────

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(), // SIG-YYYY-NNNN
  clientId: integer("client_id").notNull().references(() => billingClientsTable.id),
  engagementId: integer("engagement_id").references(() => billingEngagementsTable.id),
  invoiceDate: text("invoice_date").notNull(),         // ISO date
  dueDate: text("due_date"),                           // ISO date
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  // "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void"
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;

// ── Invoice Line Items ────────────────────────────────────────────────────────

export const invoiceLineItemsTable = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  timeEntryId: integer("time_entry_id").references(() => timeEntriesTable.id),
  description: text("description").notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItemsTable.$inferInsert;

// ── Billing Settings ──────────────────────────────────────────────────────────
// Simple key/value config store.
// Keys: "billing_increment_minutes" (default "6"), "retainer_warning_pct" (default "20")

export const billingSettingsTable = pgTable("billing_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BillingSetting = typeof billingSettingsTable.$inferSelect;
export type InsertBillingSetting = typeof billingSettingsTable.$inferInsert;

// ── Billing Audit Log ─────────────────────────────────────────────────────────

export const billingAuditLogTable = pgTable("billing_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),                          // portal_users.id, nullable if system
  userEmail: text("user_email"),                       // denormalized for readability
  action: text("action").notNull(),
  // "create" | "update" | "delete" | "status_change" | "bulk_status_change"
  recordType: text("record_type").notNull(),
  // "time_entry" | "invoice" | "billing_client" | "billing_engagement" | "setting"
  recordId: integer("record_id"),
  previousValue: text("previous_value"),               // JSON string of changed fields
  newValue: text("new_value"),                         // JSON string of new values
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillingAuditLog = typeof billingAuditLogTable.$inferSelect;

// ── Billing Statements ────────────────────────────────────────────────────────
// Client-facing billing summaries. Admin creates from internal time entries.
// portalUserId is the FK used to enforce client-side access control.

export const billingStatementsTable = pgTable("billing_statements", {
  id: serial("id").primaryKey(),
  statementNumber: text("statement_number").notNull(),
  billingClientId: integer("billing_client_id"),          // billing_clients.id
  engagementId: integer("engagement_id"),                 // billing_engagements.id
  portalUserId: integer("portal_user_id"),                // portal_users.id — ownership key
  billingPeriod: text("billing_period").notNull(),        // "July 2026"
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),
  statementDate: date("statement_date").notNull(),
  dueDate: date("due_date"),
  previousBalance: numeric("previous_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currentCharges: numeric("current_charges", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentsCredits: numeric("payments_credits", { precision: 12, scale: 2 }).notNull().default("0"),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull().default("0"),
  retainerApplied: numeric("retainer_applied", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingRetainer: numeric("remaining_retainer", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  // "draft" | "published" | "paid" | "partially_paid" | "overdue" | "void"
  adminNotes: text("admin_notes"),                        // internal only, never sent to client
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BillingStatement = typeof billingStatementsTable.$inferSelect;
export type InsertBillingStatement = typeof billingStatementsTable.$inferInsert;

// ── Billing Statement Items ───────────────────────────────────────────────────

export const billingStatementItemsTable = pgTable("billing_statement_items", {
  id: serial("id").primaryKey(),
  statementId: integer("statement_id").notNull().references(() => billingStatementsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  servicePeriod: text("service_period"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),       // hours / units
  rate: numeric("rate", { precision: 12, scale: 2 }),               // $/hr or unit rate
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  showQuantity: boolean("show_quantity").notNull().default(true),
  showRate: boolean("show_rate").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  timeEntryIds: text("time_entry_ids").default("[]"),                // JSON array — internal only
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillingStatementItem = typeof billingStatementItemsTable.$inferSelect;
export type InsertBillingStatementItem = typeof billingStatementItemsTable.$inferInsert;
export type InsertBillingAuditLog = typeof billingAuditLogTable.$inferInsert;
