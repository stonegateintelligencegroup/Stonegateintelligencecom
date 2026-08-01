import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// ── Users ────────────────────────────────────────────────────────────────────

export const portalUsersTable = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("client"), // "admin" | "client"
  isActive: boolean("is_active").notNull().default(false),
  inviteToken: text("invite_token"),
  inviteTokenExpiry: timestamp("invite_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export type PortalUser = typeof portalUsersTable.$inferSelect;
export type InsertPortalUser = typeof portalUsersTable.$inferInsert;

// ── Cases ────────────────────────────────────────────────────────────────────

export const portalCasesTable = pgTable("portal_cases", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => portalUsersTable.id),
  caseNumber: text("case_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // "active" | "pending" | "closed" | "on_hold"
  assignedInvestigator: text("assigned_investigator"),
  lastUpdate: timestamp("last_update").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalCase = typeof portalCasesTable.$inferSelect;
export type InsertPortalCase = typeof portalCasesTable.$inferInsert;

// ── Documents ────────────────────────────────────────────────────────────────

export const portalDocumentsTable = pgTable("portal_documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => portalCasesTable.id),
  uploadedById: integer("uploaded_by_id")
    .notNull()
    .references(() => portalUsersTable.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  objectPath: text("object_path").notNull(),
  direction: text("direction").notNull(), // "client_upload" | "admin_share"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalDocument = typeof portalDocumentsTable.$inferSelect;
export type InsertPortalDocument = typeof portalDocumentsTable.$inferInsert;

// ── Note Folders ─────────────────────────────────────────────────────────────

export const portalNoteFoldersTable = pgTable("portal_note_folders", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => portalCasesTable.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalNoteFolder = typeof portalNoteFoldersTable.$inferSelect;
export type InsertPortalNoteFolder = typeof portalNoteFoldersTable.$inferInsert;

// ── Case Notes ────────────────────────────────────────────────────────────────

export const portalCaseNotesTable = pgTable("portal_case_notes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => portalCasesTable.id),
  folderId: integer("folder_id")
    .references(() => portalNoteFoldersTable.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => portalUsersTable.id),
  title: text("title").notNull().default("Untitled Note"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PortalCaseNote = typeof portalCaseNotesTable.$inferSelect;
export type InsertPortalCaseNote = typeof portalCaseNotesTable.$inferInsert;

// ── Messages ─────────────────────────────────────────────────────────────────

export const portalMessagesTable = pgTable("portal_messages", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => portalCasesTable.id),
  senderId: integer("sender_id")
    .notNull()
    .references(() => portalUsersTable.id),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalMessage = typeof portalMessagesTable.$inferSelect;
export type InsertPortalMessage = typeof portalMessagesTable.$inferInsert;
