import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  billingClientsTable,
  billingEngagementsTable,
  timeEntriesTable,
  invoicesTable,
  invoiceLineItemsTable,
  billingSettingsTable,
  billingAuditLogTable,
  billingStatementsTable,
  billingStatementItemsTable,
} from "@workspace/db";
import { eq, desc, and, gte, lte, inArray, sql, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();
router.use(requireAdmin);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSettingValue(key: string, fallback: string): Promise<string> {
  const [row] = await db
    .select()
    .from(billingSettingsTable)
    .where(eq(billingSettingsTable.key, key))
    .limit(1);
  return row?.value ?? fallback;
}

/** Round minutes up to the nearest billing increment. Returns billed minutes. */
function roundToBillingIncrement(rawMinutes: number, incrementMinutes: number): number {
  if (rawMinutes <= 0) return 0;
  return Math.ceil(rawMinutes / incrementMinutes) * incrementMinutes;
}

async function writeAudit(
  req: Request,
  action: string,
  recordType: string,
  recordId: number | null,
  previousValue: object | null,
  newValue: object | null
) {
  try {
    await db.insert(billingAuditLogTable).values({
      userId: req.session.userId ?? null,
      userEmail: (req as any).session?.userEmail ?? null,
      action,
      recordType,
      recordId: recordId ?? undefined,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
    });
  } catch {
    // audit failures must never break the main operation
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

// GET /api/portal/billing/settings
router.get("/settings", async (_req: Request, res: Response) => {
  const rows = await db.select().from(billingSettingsTable);
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

// PATCH /api/portal/billing/settings
router.patch("/settings", async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(billingSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: billingSettingsTable.key, set: { value, updatedAt: new Date() } });
  }
  await writeAudit(req, "update", "setting", null, null, updates);
  res.json({ ok: true });
});

// ── Billing Clients ───────────────────────────────────────────────────────────

// GET /api/portal/billing/clients
router.get("/clients", async (req: Request, res: Response) => {
  let rows = await db
    .select()
    .from(billingClientsTable)
    .orderBy(asc(billingClientsTable.name));

  if (req.query.active !== undefined) {
    const active = req.query.active === "true";
    rows = rows.filter(r => r.isActive === active);
  }
  if (req.query.search) {
    const q = (req.query.search as string).toLowerCase();
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.primaryContact ?? "").toLowerCase().includes(q)
    );
  }
  res.json(rows);
});

// POST /api/portal/billing/clients
router.post("/clients", async (req: Request, res: Response) => {
  const { name, primaryContact, email, phone, address, billingContact,
          billingEmail, defaultRate, paymentTerms, notes, linkedPortalUserId } = req.body;
  if (!name) { res.status(400).json({ error: "name is required." }); return; }

  const [row] = await db.insert(billingClientsTable).values({
    name, primaryContact, email, phone, address, billingContact,
    billingEmail, defaultRate: defaultRate?.toString(), paymentTerms, notes,
    linkedPortalUserId: linkedPortalUserId ? Number(linkedPortalUserId) : null,
  }).returning();

  await writeAudit(req, "create", "billing_client", row.id, null, row);
  res.status(201).json(row);
});

// PATCH /api/portal/billing/clients/:id
router.patch("/clients/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [before] = await db.select().from(billingClientsTable).where(eq(billingClientsTable.id, id)).limit(1);
  if (!before) { res.status(404).json({ error: "Client not found." }); return; }

  const { name, primaryContact, email, phone, address, billingContact,
          billingEmail, defaultRate, paymentTerms, notes, isActive, linkedPortalUserId } = req.body;

  const [updated] = await db.update(billingClientsTable).set({
    ...(name !== undefined && { name }),
    ...(primaryContact !== undefined && { primaryContact }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(address !== undefined && { address }),
    ...(billingContact !== undefined && { billingContact }),
    ...(billingEmail !== undefined && { billingEmail }),
    ...(defaultRate !== undefined && { defaultRate: defaultRate?.toString() }),
    ...(paymentTerms !== undefined && { paymentTerms }),
    ...(notes !== undefined && { notes }),
    ...(isActive !== undefined && { isActive }),
    ...(linkedPortalUserId !== undefined && { linkedPortalUserId: linkedPortalUserId ? Number(linkedPortalUserId) : null }),
    updatedAt: new Date(),
  }).where(eq(billingClientsTable.id, id)).returning();

  await writeAudit(req, "update", "billing_client", id, before, updated);
  res.json(updated);
});

// DELETE /api/portal/billing/clients/:id
router.delete("/clients/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(billingClientsTable).where(eq(billingClientsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Client not found." }); return; }
  await writeAudit(req, "delete", "billing_client", id, deleted, null);
  res.json({ deleted: true });
});

// ── Billing Engagements ───────────────────────────────────────────────────────

// GET /api/portal/billing/engagements
router.get("/engagements", async (req: Request, res: Response) => {
  let rows = await db
    .select({
      engagement: billingEngagementsTable,
      clientName: billingClientsTable.name,
    })
    .from(billingEngagementsTable)
    .leftJoin(billingClientsTable, eq(billingEngagementsTable.clientId, billingClientsTable.id))
    .orderBy(desc(billingEngagementsTable.createdAt));

  if (req.query.clientId) {
    const cid = Number(req.query.clientId);
    rows = rows.filter(r => r.engagement.clientId === cid);
  }
  if (req.query.status) {
    rows = rows.filter(r => r.engagement.status === req.query.status);
  }

  // Compute billed amount used from time entries
  const engagementIds = rows.map(r => r.engagement.id);
  let usedMap: Record<number, number> = {};
  if (engagementIds.length > 0) {
    const usage = await db
      .select({
        engagementId: timeEntriesTable.engagementId,
        total: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END), 0)`,
      })
      .from(timeEntriesTable)
      .where(inArray(timeEntriesTable.engagementId, engagementIds))
      .groupBy(timeEntriesTable.engagementId);
    for (const u of usage) {
      if (u.engagementId) usedMap[u.engagementId] = parseFloat(u.total);
    }
  }

  res.json(rows.map(r => ({
    ...r.engagement,
    clientName: r.clientName,
    billedAmount: usedMap[r.engagement.id] ?? 0,
  })));
});

// POST /api/portal/billing/engagements
router.post("/engagements", async (req: Request, res: Response) => {
  const { clientId, name, description, caseType, dateOpened, targetCompletion,
          assignedInvestigator, billingStructure, hourlyRate, retainerAmount,
          retainerStartDate, budget, status, notes } = req.body;
  if (!clientId || !name || !dateOpened) {
    res.status(400).json({ error: "clientId, name, and dateOpened are required." });
    return;
  }
  const [row] = await db.insert(billingEngagementsTable).values({
    clientId: Number(clientId), name, description, caseType, dateOpened,
    targetCompletion, assignedInvestigator, billingStructure, notes,
    hourlyRate: hourlyRate?.toString(), retainerAmount: retainerAmount?.toString(),
    retainerStartDate, budget: budget?.toString(), status,
  }).returning();

  await writeAudit(req, "create", "billing_engagement", row.id, null, row);
  res.status(201).json(row);
});

// PATCH /api/portal/billing/engagements/:id
router.patch("/engagements/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [before] = await db.select().from(billingEngagementsTable).where(eq(billingEngagementsTable.id, id)).limit(1);
  if (!before) { res.status(404).json({ error: "Engagement not found." }); return; }

  const fields: any = {};
  const allowed = ["name","description","caseType","dateOpened","targetCompletion",
    "assignedInvestigator","billingStructure","hourlyRate","retainerAmount",
    "retainerStartDate","budget","status","notes"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      fields[k] = ["hourlyRate","retainerAmount","budget"].includes(k)
        ? req.body[k]?.toString()
        : req.body[k];
    }
  }
  fields.updatedAt = new Date();

  const [updated] = await db.update(billingEngagementsTable).set(fields)
    .where(eq(billingEngagementsTable.id, id)).returning();

  const action = req.body.status && req.body.status !== before.status ? "status_change" : "update";
  await writeAudit(req, action, "billing_engagement", id, before, updated);
  res.json(updated);
});

// DELETE /api/portal/billing/engagements/:id
router.delete("/engagements/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(billingEngagementsTable).where(eq(billingEngagementsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Engagement not found." }); return; }
  await writeAudit(req, "delete", "billing_engagement", id, deleted, null);
  res.json({ deleted: true });
});

// ── Time Entries ──────────────────────────────────────────────────────────────

// GET /api/portal/billing/time-entries
router.get("/time-entries", async (req: Request, res: Response) => {
  const { dateFrom, dateTo, clientId, engagementId, investigator, billable, billingStatus } = req.query;

  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));
  if (clientId) conditions.push(eq(timeEntriesTable.clientId, Number(clientId)));
  if (engagementId) conditions.push(eq(timeEntriesTable.engagementId!, Number(engagementId)));
  if (investigator) conditions.push(eq(timeEntriesTable.investigator, investigator as string));
  if (billable !== undefined) conditions.push(eq(timeEntriesTable.billable, billable === "true"));
  if (billingStatus) conditions.push(eq(timeEntriesTable.billingStatus, billingStatus as string));

  const rows = await db
    .select({
      entry: timeEntriesTable,
      clientName: billingClientsTable.name,
      linkedPortalUserId: billingClientsTable.linkedPortalUserId,
      engagementName: billingEngagementsTable.name,
      linkedPortalCaseId: billingEngagementsTable.linkedPortalCaseId,
    })
    .from(timeEntriesTable)
    .leftJoin(billingClientsTable, eq(timeEntriesTable.clientId, billingClientsTable.id))
    .leftJoin(billingEngagementsTable, eq(timeEntriesTable.engagementId!, billingEngagementsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(timeEntriesTable.date), desc(timeEntriesTable.createdAt));

  res.json(rows.map(r => ({
    ...r.entry,
    clientName: r.clientName,
    linkedPortalUserId: r.linkedPortalUserId,
    engagementName: r.engagementName,
    linkedPortalCaseId: r.linkedPortalCaseId,
  })));
});

// GET /api/portal/billing/time-entries/summary — aggregate stats for dashboard
router.get("/time-entries/summary", async (req: Request, res: Response) => {
  const { dateFrom, dateTo, clientId, engagementId, investigator, billingStatus } = req.query;

  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));
  if (clientId) conditions.push(eq(timeEntriesTable.clientId, Number(clientId)));
  if (engagementId) conditions.push(eq(timeEntriesTable.engagementId!, Number(engagementId)));
  if (investigator) conditions.push(eq(timeEntriesTable.investigator, investigator as string));
  if (billingStatus) conditions.push(eq(timeEntriesTable.billingStatus, billingStatus as string));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [summary] = await db
    .select({
      totalMinutes: sql<string>`COALESCE(SUM(${timeEntriesTable.billedMinutes}), 0)`,
      billableMinutes: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END), 0)`,
      nonBillableMinutes: sql<string>`COALESCE(SUM(CASE WHEN NOT ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END), 0)`,
      billableAmount: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END), 0)`,
      unbilledAmount: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntriesTable.billable} AND ${timeEntriesTable.billingStatus} IN ('unbilled','ready_to_invoice') THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END), 0)`,
      invoicedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${timeEntriesTable.billingStatus} IN ('invoiced','paid') THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END), 0)`,
    })
    .from(timeEntriesTable)
    .where(where);

  res.json({
    totalHours: parseFloat(summary.totalMinutes) / 60,
    billableHours: parseFloat(summary.billableMinutes) / 60,
    nonBillableHours: parseFloat(summary.nonBillableMinutes) / 60,
    billableAmount: parseFloat(summary.billableAmount),
    unbilledAmount: parseFloat(summary.unbilledAmount),
    invoicedAmount: parseFloat(summary.invoicedAmount),
  });
});

// POST /api/portal/billing/time-entries
router.post("/time-entries", async (req: Request, res: Response) => {
  const {
    date, startTime, endTime, durationMinutes: rawDuration,
    clientId, engagementId, investigator, activityType,
    description, billable, billingRate, internalNotes,
  } = req.body;

  if (!date || !clientId || !investigator || !activityType) {
    res.status(400).json({ error: "date, clientId, investigator, and activityType are required." });
    return;
  }

  let durationMins: number;
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    durationMins = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMins < 0) durationMins += 1440; // overnight
  } else if (rawDuration != null) {
    durationMins = Number(rawDuration);
  } else {
    res.status(400).json({ error: "Provide startTime+endTime or durationMinutes." });
    return;
  }
  if (durationMins < 0) {
    res.status(400).json({ error: "Duration cannot be negative." });
    return;
  }

  const incrementMins = parseInt(await getSettingValue("billing_increment_minutes", "6"), 10);
  const billedMins = roundToBillingIncrement(durationMins, incrementMins);
  const billedHrs = (billedMins / 60).toFixed(2);

  let rate = billingRate != null ? parseFloat(billingRate) : null;
  if (rate == null && engagementId) {
    const [eng] = await db.select().from(billingEngagementsTable).where(eq(billingEngagementsTable.id, Number(engagementId))).limit(1);
    if (eng?.hourlyRate) rate = parseFloat(eng.hourlyRate);
  }
  if (rate == null) {
    const [client] = await db.select().from(billingClientsTable).where(eq(billingClientsTable.id, Number(clientId))).limit(1);
    if (client?.defaultRate) rate = parseFloat(client.defaultRate);
  }

  const isBillable = billable !== false && billable !== "false";
  const amount = (isBillable && rate != null) ? (parseFloat(billedHrs) * rate).toFixed(2) : "0.00";

  const [row] = await db.insert(timeEntriesTable).values({
    date,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    durationMinutes: durationMins,
    billedMinutes: billedMins,
    billedHours: billedHrs,
    clientId: Number(clientId),
    engagementId: engagementId ? Number(engagementId) : undefined,
    investigator,
    activityType,
    description,
    billable: isBillable,
    billingRate: rate?.toString() ?? null,
    billableAmount: amount,
    internalNotes,
    createdByUserId: req.session.userId ?? undefined,
  }).returning();

  await writeAudit(req, "create", "time_entry", row.id, null, row);
  res.status(201).json(row);
});

// POST /api/portal/billing/time-entries/:id/duplicate
router.post("/time-entries/:id/duplicate", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [src] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id)).limit(1);
  if (!src) { res.status(404).json({ error: "Time entry not found." }); return; }

  const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = src;
  const [dup] = await db.insert(timeEntriesTable).values({
    ...rest,
    billingStatus: "unbilled",
    date: req.body.date ?? src.date,
  }).returning();

  await writeAudit(req, "create", "time_entry", dup.id, null, { duplicatedFrom: id, ...dup });
  res.status(201).json(dup);
});

// PATCH /api/portal/billing/time-entries/:id
router.patch("/time-entries/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [before] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id)).limit(1);
  if (!before) { res.status(404).json({ error: "Time entry not found." }); return; }

  const body = req.body;
  const fields: any = {};

  // Recalculate duration/billed fields if time fields change
  const incrementMins = parseInt(await getSettingValue("billing_increment_minutes", "6"), 10);
  let durationMins = before.durationMinutes;
  let billedMins = before.billedMinutes;
  let billedHrs = parseFloat(before.billedHours);

  if (body.startTime !== undefined || body.endTime !== undefined || body.durationMinutes !== undefined) {
    const st = body.startTime ?? before.startTime;
    const et = body.endTime ?? before.endTime;
    if (st && et) {
      const [sh, sm] = st.split(":").map(Number);
      const [eh, em] = et.split(":").map(Number);
      durationMins = (eh * 60 + em) - (sh * 60 + sm);
      if (durationMins < 0) durationMins += 1440;
    } else if (body.durationMinutes != null) {
      durationMins = Number(body.durationMinutes);
    }
    if (durationMins < 0) { res.status(400).json({ error: "Duration cannot be negative." }); return; }
    billedMins = roundToBillingIncrement(durationMins, incrementMins);
    billedHrs = billedMins / 60;
    fields.durationMinutes = durationMins;
    fields.billedMinutes = billedMins;
    fields.billedHours = billedHrs.toFixed(2);
  }

  const allowed = ["date","startTime","endTime","clientId","engagementId","investigator",
    "activityType","description","billable","billingRate","billingStatus","internalNotes"];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === "billingRate") fields[k] = body[k]?.toString();
      else if (k === "clientId" || k === "engagementId") fields[k] = body[k] != null ? Number(body[k]) : null;
      else fields[k] = body[k];
    }
  }

  // Recalculate billable amount
  const isBillable = (body.billable ?? before.billable) !== false;
  const rate = parseFloat(body.billingRate?.toString() ?? before.billingRate ?? "0");
  fields.billableAmount = (isBillable && rate > 0) ? (billedHrs * rate).toFixed(2) : "0.00";
  fields.updatedAt = new Date();

  const [updated] = await db.update(timeEntriesTable).set(fields)
    .where(eq(timeEntriesTable.id, id)).returning();

  const action = body.billingStatus && body.billingStatus !== before.billingStatus ? "status_change" : "update";
  await writeAudit(req, action, "time_entry", id,
    { billingRate: before.billingRate, billingStatus: before.billingStatus, billedHours: before.billedHours },
    { billingRate: updated.billingRate, billingStatus: updated.billingStatus, billedHours: updated.billedHours }
  );
  res.json(updated);
});

// DELETE /api/portal/billing/time-entries/:id
router.delete("/time-entries/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Time entry not found." }); return; }
  await writeAudit(req, "delete", "time_entry", id, deleted, null);
  res.json({ deleted: true });
});

// POST /api/portal/billing/time-entries/bulk-status
router.post("/time-entries/bulk-status", async (req: Request, res: Response) => {
  const { ids, billingStatus } = req.body;
  const allowed = ["unbilled", "ready_to_invoice", "invoiced", "paid", "written_off"];
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required." });
    return;
  }
  if (!allowed.includes(billingStatus)) {
    res.status(400).json({ error: `billingStatus must be one of: ${allowed.join(", ")}` });
    return;
  }
  await db.update(timeEntriesTable)
    .set({ billingStatus, updatedAt: new Date() })
    .where(inArray(timeEntriesTable.id, ids.map(Number)));

  await writeAudit(req, "bulk_status_change", "time_entry", null, null, { ids, billingStatus });
  res.json({ updated: ids.length, billingStatus });
});

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /api/portal/billing/reports/by-client
router.get("/reports/by-client", async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));

  const rows = await db
    .select({
      clientId: timeEntriesTable.clientId,
      clientName: billingClientsTable.name,
      totalMinutes: sql<string>`SUM(${timeEntriesTable.billedMinutes})`,
      billableMinutes: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END)`,
      nonBillableMinutes: sql<string>`SUM(CASE WHEN NOT ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END)`,
      billableAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      unbilledAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} AND ${timeEntriesTable.billingStatus} IN ('unbilled','ready_to_invoice') THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      invoicedAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billingStatus} IN ('invoiced','paid') THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
    })
    .from(timeEntriesTable)
    .leftJoin(billingClientsTable, eq(timeEntriesTable.clientId, billingClientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(timeEntriesTable.clientId, billingClientsTable.name)
    .orderBy(billingClientsTable.name);

  res.json(rows.map(r => ({
    clientId: r.clientId,
    clientName: r.clientName,
    totalHours: parseFloat(r.totalMinutes) / 60,
    billableHours: parseFloat(r.billableMinutes) / 60,
    nonBillableHours: parseFloat(r.nonBillableMinutes) / 60,
    billableAmount: parseFloat(r.billableAmount),
    unbilledAmount: parseFloat(r.unbilledAmount),
    invoicedAmount: parseFloat(r.invoicedAmount),
  })));
});

// GET /api/portal/billing/reports/by-case
router.get("/reports/by-case", async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));

  const rows = await db
    .select({
      engagementId: timeEntriesTable.engagementId,
      engagementName: billingEngagementsTable.name,
      clientName: billingClientsTable.name,
      budget: billingEngagementsTable.budget,
      totalMinutes: sql<string>`SUM(${timeEntriesTable.billedMinutes})`,
      billableAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
    })
    .from(timeEntriesTable)
    .leftJoin(billingEngagementsTable, eq(timeEntriesTable.engagementId!, billingEngagementsTable.id))
    .leftJoin(billingClientsTable, eq(timeEntriesTable.clientId, billingClientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(timeEntriesTable.engagementId, billingEngagementsTable.name, billingClientsTable.name, billingEngagementsTable.budget)
    .orderBy(billingEngagementsTable.name);

  res.json(rows.map(r => {
    const budget = r.budget ? parseFloat(r.budget) : null;
    const billed = parseFloat(r.billableAmount);
    return {
      engagementId: r.engagementId,
      engagementName: r.engagementName,
      clientName: r.clientName,
      totalHours: parseFloat(r.totalMinutes) / 60,
      billableAmount: billed,
      budget,
      remainingBudget: budget != null ? budget - billed : null,
    };
  }));
});

// GET /api/portal/billing/reports/by-investigator
router.get("/reports/by-investigator", async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));

  const rows = await db
    .select({
      investigator: timeEntriesTable.investigator,
      totalMinutes: sql<string>`SUM(${timeEntriesTable.billedMinutes})`,
      billableMinutes: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END)`,
      nonBillableMinutes: sql<string>`SUM(CASE WHEN NOT ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END)`,
      billableAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
    })
    .from(timeEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(timeEntriesTable.investigator)
    .orderBy(timeEntriesTable.investigator);

  res.json(rows.map(r => ({
    investigator: r.investigator,
    totalHours: parseFloat(r.totalMinutes) / 60,
    billableHours: parseFloat(r.billableMinutes) / 60,
    nonBillableHours: parseFloat(r.nonBillableMinutes) / 60,
    billableAmount: parseFloat(r.billableAmount),
  })));
});

// GET /api/portal/billing/reports/billing-summary
router.get("/reports/billing-summary", async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  const conditions = [];
  if (dateFrom) conditions.push(gte(timeEntriesTable.date, dateFrom as string));
  if (dateTo)   conditions.push(lte(timeEntriesTable.date, dateTo as string));

  const [summary] = await db
    .select({
      billableHours: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billedMinutes} ELSE 0 END)`,
      billableAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      unbilledAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billable} AND ${timeEntriesTable.billingStatus} IN ('unbilled','ready_to_invoice') THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      invoicedAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billingStatus} = 'invoiced' THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      paidAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billingStatus} = 'paid' THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
      writtenOffAmount: sql<string>`SUM(CASE WHEN ${timeEntriesTable.billingStatus} = 'written_off' THEN ${timeEntriesTable.billableAmount}::numeric ELSE 0 END)`,
    })
    .from(timeEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({
    billableHours: parseFloat(summary.billableHours ?? "0") / 60,
    billableAmount: parseFloat(summary.billableAmount ?? "0"),
    unbilledAmount: parseFloat(summary.unbilledAmount ?? "0"),
    invoicedAmount: parseFloat(summary.invoicedAmount ?? "0"),
    paidAmount: parseFloat(summary.paidAmount ?? "0"),
    writtenOffAmount: parseFloat(summary.writtenOffAmount ?? "0"),
  });
});

// ── Invoices ──────────────────────────────────────────────────────────────────

// GET /api/portal/billing/invoices
router.get("/invoices", async (req: Request, res: Response) => {
  let rows = await db
    .select({
      invoice: invoicesTable,
      clientName: billingClientsTable.name,
      engagementName: billingEngagementsTable.name,
    })
    .from(invoicesTable)
    .leftJoin(billingClientsTable, eq(invoicesTable.clientId, billingClientsTable.id))
    .leftJoin(billingEngagementsTable, eq(invoicesTable.engagementId!, billingEngagementsTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  if (req.query.status) {
    rows = rows.filter(r => r.invoice.status === req.query.status);
  }
  if (req.query.clientId) {
    rows = rows.filter(r => r.invoice.clientId === Number(req.query.clientId));
  }

  res.json(rows.map(r => ({ ...r.invoice, clientName: r.clientName, engagementName: r.engagementName })));
});

// GET /api/portal/billing/invoices/:id
router.get("/invoices/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [inv] = await db
    .select({
      invoice: invoicesTable,
      clientName: billingClientsTable.name,
      engagementName: billingEngagementsTable.name,
    })
    .from(invoicesTable)
    .leftJoin(billingClientsTable, eq(invoicesTable.clientId, billingClientsTable.id))
    .leftJoin(billingEngagementsTable, eq(invoicesTable.engagementId!, billingEngagementsTable.id))
    .where(eq(invoicesTable.id, id))
    .limit(1);

  if (!inv) { res.status(404).json({ error: "Invoice not found." }); return; }

  const lineItems = await db
    .select()
    .from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, id))
    .orderBy(asc(invoiceLineItemsTable.id));

  res.json({ ...inv.invoice, clientName: inv.clientName, engagementName: inv.engagementName, lineItems });
});

// POST /api/portal/billing/invoices — create invoice from selected time entries
router.post("/invoices", async (req: Request, res: Response) => {
  const { clientId, engagementId, timeEntryIds, invoiceDate, dueDate, taxAmount, notes } = req.body;
  if (!clientId || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
    res.status(400).json({ error: "clientId and timeEntryIds are required." });
    return;
  }

  // Fetch selected time entries
  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(inArray(timeEntriesTable.id, timeEntryIds.map(Number)));

  if (entries.length === 0) { res.status(400).json({ error: "No valid time entries found." }); return; }

  // Generate invoice number: SIG-YYYY-NNNN
  const year = new Date().getFullYear();
  const prefix = `SIG-${year}-`;
  const [lastInv] = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(sql`${invoicesTable.invoiceNumber} LIKE ${prefix + "%"}`)
    .orderBy(desc(invoicesTable.invoiceNumber))
    .limit(1);

  let seq = 1;
  if (lastInv) {
    const parts = lastInv.invoiceNumber.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  const invoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;

  const subtotal = entries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + parseFloat(e.billableAmount ?? "0"), 0);
  const tax = parseFloat(taxAmount ?? "0");
  const total = subtotal + tax;

  const [invoice] = await db.insert(invoicesTable).values({
    invoiceNumber,
    clientId: Number(clientId),
    engagementId: engagementId ? Number(engagementId) : undefined,
    invoiceDate: invoiceDate ?? new Date().toISOString().split("T")[0],
    dueDate: dueDate ?? null,
    subtotal: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    total: total.toFixed(2),
    notes,
    createdByUserId: req.session.userId ?? undefined,
  }).returning();

  // Create line items
  const lineItems = entries.map(e => ({
    invoiceId: invoice.id,
    timeEntryId: e.id,
    description: [e.activityType, e.description].filter(Boolean).join(" — "),
    hours: e.billedHours,
    rate: e.billingRate ?? "0",
    amount: e.billableAmount ?? "0",
  }));
  await db.insert(invoiceLineItemsTable).values(lineItems);

  // Mark time entries as invoiced
  await db.update(timeEntriesTable)
    .set({ billingStatus: "invoiced", updatedAt: new Date() })
    .where(inArray(timeEntriesTable.id, timeEntryIds.map(Number)));

  await writeAudit(req, "create", "invoice", invoice.id, null, { invoiceNumber, entryCount: entries.length, total });
  res.status(201).json({ ...invoice, lineItems });
});

// PATCH /api/portal/billing/invoices/:id — status updates only
router.patch("/invoices/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [before] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!before) { res.status(404).json({ error: "Invoice not found." }); return; }

  const allowed = ["status", "dueDate", "notes", "taxAmount"];
  const fields: any = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) fields[k] = req.body[k];
  }
  // Recalculate total if tax changes
  if (fields.taxAmount !== undefined) {
    const tax = parseFloat(fields.taxAmount);
    fields.total = (parseFloat(before.subtotal) + tax).toFixed(2);
  }
  fields.updatedAt = new Date();

  const [updated] = await db.update(invoicesTable).set(fields)
    .where(eq(invoicesTable.id, id)).returning();

  const action = fields.status && fields.status !== before.status ? "status_change" : "update";
  await writeAudit(req, action, "invoice", id, { status: before.status }, { status: updated.status });
  res.json(updated);
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

// GET /api/portal/billing/audit-log
router.get("/audit-log", async (req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(billingAuditLogTable)
    .orderBy(desc(billingAuditLogTable.createdAt))
    .limit(200);
  res.json(rows);
});

// ── Billing Statements ────────────────────────────────────────────────────────

/** Auto-generate next statement number: SIG-YYYY-NNNN */
async function nextStatementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SIG-${year}-`;
  const [row] = await db
    .select({ num: billingStatementsTable.statementNumber })
    .from(billingStatementsTable)
    .where(sql`${billingStatementsTable.statementNumber} LIKE ${prefix + "%"}`)
    .orderBy(desc(billingStatementsTable.id))
    .limit(1);
  let seq = 1;
  if (row) {
    const parts = row.num.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// GET /api/portal/billing/statements
router.get("/statements", async (req: Request, res: Response) => {
  const rows = await db
    .select({
      stmt: billingStatementsTable,
      clientName: billingClientsTable.name,
      engagementName: billingEngagementsTable.name,
    })
    .from(billingStatementsTable)
    .leftJoin(billingClientsTable, eq(billingStatementsTable.billingClientId, billingClientsTable.id))
    .leftJoin(billingEngagementsTable, eq(billingStatementsTable.engagementId, billingEngagementsTable.id))
    .orderBy(desc(billingStatementsTable.createdAt));

  res.json(rows.map(r => ({
    ...r.stmt,
    clientName: r.clientName,
    engagementName: r.engagementName,
  })));
});

// POST /api/portal/billing/statements
router.post("/statements", async (req: Request, res: Response) => {
  const {
    billingClientId, engagementId, portalUserId,
    billingPeriod, billingPeriodStart, billingPeriodEnd,
    statementDate, dueDate,
    previousBalance = 0, currentCharges = 0, paymentsCredits = 0,
    retainerApplied = 0, remainingRetainer = 0,
    adminNotes,
  } = req.body;

  if (!billingPeriod || !statementDate) {
    res.status(400).json({ error: "billingPeriod and statementDate are required." });
    return;
  }

  const amountDue = Math.max(
    0,
    parseFloat(String(previousBalance)) +
    parseFloat(String(currentCharges)) -
    parseFloat(String(paymentsCredits)) -
    parseFloat(String(retainerApplied))
  );

  const statementNumber = await nextStatementNumber();

  const [row] = await db
    .insert(billingStatementsTable)
    .values({
      statementNumber,
      billingClientId: billingClientId ? Number(billingClientId) : null,
      engagementId: engagementId ? Number(engagementId) : null,
      portalUserId: portalUserId ? Number(portalUserId) : null,
      billingPeriod,
      billingPeriodStart: billingPeriodStart || null,
      billingPeriodEnd: billingPeriodEnd || null,
      statementDate,
      dueDate: dueDate || null,
      previousBalance: String(previousBalance),
      currentCharges: String(currentCharges),
      paymentsCredits: String(paymentsCredits),
      amountDue: String(amountDue),
      retainerApplied: String(retainerApplied),
      remainingRetainer: String(remainingRetainer),
      adminNotes: adminNotes || null,
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/portal/billing/statements/:id
router.get("/statements/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      stmt: billingStatementsTable,
      clientName: billingClientsTable.name,
      clientAddress: billingClientsTable.address,
      clientEmail: billingClientsTable.billingEmail,
      engagementName: billingEngagementsTable.name,
    })
    .from(billingStatementsTable)
    .leftJoin(billingClientsTable, eq(billingStatementsTable.billingClientId, billingClientsTable.id))
    .leftJoin(billingEngagementsTable, eq(billingStatementsTable.engagementId, billingEngagementsTable.id))
    .where(eq(billingStatementsTable.id, id));

  if (!row) { res.status(404).json({ error: "Not found." }); return; }

  const items = await db
    .select()
    .from(billingStatementItemsTable)
    .where(eq(billingStatementItemsTable.statementId, id))
    .orderBy(asc(billingStatementItemsTable.sortOrder), asc(billingStatementItemsTable.id));

  res.json({ ...row.stmt, clientName: row.clientName, clientAddress: row.clientAddress, clientEmail: row.clientEmail, engagementName: row.engagementName, items });
});

// PATCH /api/portal/billing/statements/:id
router.patch("/statements/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    billingClientId, engagementId, portalUserId,
    billingPeriod, billingPeriodStart, billingPeriodEnd,
    statementDate, dueDate,
    previousBalance, currentCharges, paymentsCredits,
    retainerApplied, remainingRetainer,
    status, adminNotes,
  } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (billingClientId !== undefined) updates.billingClientId = billingClientId ? Number(billingClientId) : null;
  if (engagementId !== undefined) updates.engagementId = engagementId ? Number(engagementId) : null;
  if (portalUserId !== undefined) updates.portalUserId = portalUserId ? Number(portalUserId) : null;
  if (billingPeriod !== undefined) updates.billingPeriod = billingPeriod;
  if (billingPeriodStart !== undefined) updates.billingPeriodStart = billingPeriodStart || null;
  if (billingPeriodEnd !== undefined) updates.billingPeriodEnd = billingPeriodEnd || null;
  if (statementDate !== undefined) updates.statementDate = statementDate;
  if (dueDate !== undefined) updates.dueDate = dueDate || null;
  if (previousBalance !== undefined) updates.previousBalance = String(previousBalance);
  if (currentCharges !== undefined) updates.currentCharges = String(currentCharges);
  if (paymentsCredits !== undefined) updates.paymentsCredits = String(paymentsCredits);
  if (retainerApplied !== undefined) updates.retainerApplied = String(retainerApplied);
  if (remainingRetainer !== undefined) updates.remainingRetainer = String(remainingRetainer);
  if (adminNotes !== undefined) updates.adminNotes = adminNotes || null;
  if (status !== undefined) updates.status = status;

  // Recompute amount due from known fields
  if (previousBalance !== undefined || currentCharges !== undefined || paymentsCredits !== undefined || retainerApplied !== undefined) {
    const [current] = await db.select().from(billingStatementsTable).where(eq(billingStatementsTable.id, id)).limit(1);
    if (current) {
      const pb = parseFloat(String(updates.previousBalance ?? current.previousBalance ?? 0));
      const cc = parseFloat(String(updates.currentCharges ?? current.currentCharges ?? 0));
      const pc = parseFloat(String(updates.paymentsCredits ?? current.paymentsCredits ?? 0));
      const ra = parseFloat(String(updates.retainerApplied ?? current.retainerApplied ?? 0));
      updates.amountDue = String(Math.max(0, pb + cc - pc - ra));
    }
  }

  const [updated] = await db
    .update(billingStatementsTable)
    .set(updates as any)
    .where(eq(billingStatementsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found." }); return; }
  res.json(updated);
});

// POST /api/portal/billing/statements/:id/publish
router.post("/statements/:id/publish", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(billingStatementsTable)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(billingStatementsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found." }); return; }
  res.json(updated);
});

// PATCH /api/portal/billing/statements/:id/status
router.patch("/statements/:id/status", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const validStatuses = ["draft","published","paid","partially_paid","overdue","void"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status." }); return; }

  const extraFields: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published") extraFields.publishedAt = new Date();

  const [updated] = await db
    .update(billingStatementsTable)
    .set(extraFields as any)
    .where(eq(billingStatementsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found." }); return; }
  res.json(updated);
});

// DELETE /api/portal/billing/statements/:id
router.delete("/statements/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(billingStatementsTable).where(eq(billingStatementsTable.id, id));
  res.json({ ok: true });
});

// POST /api/portal/billing/statements/:id/items
router.post("/statements/:id/items", async (req: Request, res: Response) => {
  const statementId = Number(req.params.id);
  const { description, servicePeriod, quantity, rate, amount, showQuantity, showRate, sortOrder, timeEntryIds } = req.body;
  if (!description) { res.status(400).json({ error: "description is required." }); return; }

  const [item] = await db
    .insert(billingStatementItemsTable)
    .values({
      statementId,
      description,
      servicePeriod: servicePeriod || null,
      quantity: quantity != null ? String(quantity) : null,
      rate: rate != null ? String(rate) : null,
      amount: String(amount ?? 0),
      showQuantity: showQuantity !== false,
      showRate: showRate !== false,
      sortOrder: sortOrder ?? 0,
      timeEntryIds: Array.isArray(timeEntryIds) ? timeEntryIds.map(Number) : [],
    })
    .returning();

  // Mark linked time entries as ready_to_invoice so they show as attached
  if (Array.isArray(timeEntryIds) && timeEntryIds.length > 0) {
    await db
      .update(timeEntriesTable)
      .set({ billingStatus: "ready_to_invoice", updatedAt: new Date() })
      .where(and(
        inArray(timeEntriesTable.id, timeEntryIds.map(Number)),
        eq(timeEntriesTable.billingStatus, "unbilled"),
      ));
  }

  // Recompute current charges from all items
  await recalcStatementCharges(statementId);
  res.status(201).json(item);
});

// PATCH /api/portal/billing/statements/:id/items/:itemId
router.patch("/statements/:id/items/:itemId", async (req: Request, res: Response) => {
  const statementId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { description, servicePeriod, quantity, rate, amount, showQuantity, showRate, sortOrder, timeEntryIds } = req.body;

  const updates: Record<string, unknown> = {};
  if (description !== undefined) updates.description = description;
  if (servicePeriod !== undefined) updates.servicePeriod = servicePeriod || null;
  if (quantity !== undefined) updates.quantity = quantity != null ? String(quantity) : null;
  if (rate !== undefined) updates.rate = rate != null ? String(rate) : null;
  if (amount !== undefined) updates.amount = String(amount);
  if (showQuantity !== undefined) updates.showQuantity = showQuantity;
  if (showRate !== undefined) updates.showRate = showRate;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (timeEntryIds !== undefined) updates.timeEntryIds = Array.isArray(timeEntryIds) ? timeEntryIds.map(Number) : [];

  const [item] = await db
    .update(billingStatementItemsTable)
    .set(updates as any)
    .where(and(eq(billingStatementItemsTable.id, itemId), eq(billingStatementItemsTable.statementId, statementId)))
    .returning();

  await recalcStatementCharges(statementId);
  res.json(item);
});

// DELETE /api/portal/billing/statements/:id/items/:itemId
router.delete("/statements/:id/items/:itemId", async (req: Request, res: Response) => {
  const statementId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  await db
    .delete(billingStatementItemsTable)
    .where(and(eq(billingStatementItemsTable.id, itemId), eq(billingStatementItemsTable.statementId, statementId)));
  await recalcStatementCharges(statementId);
  res.json({ ok: true });
});

async function recalcStatementCharges(statementId: number) {
  const items = await db.select({ amount: billingStatementItemsTable.amount }).from(billingStatementItemsTable).where(eq(billingStatementItemsTable.statementId, statementId));
  const total = items.reduce((s, i) => s + parseFloat(String(i.amount ?? 0)), 0);
  const [current] = await db.select().from(billingStatementsTable).where(eq(billingStatementsTable.id, statementId)).limit(1);
  if (!current) return;
  const pb = parseFloat(String(current.previousBalance ?? 0));
  const pc = parseFloat(String(current.paymentsCredits ?? 0));
  const ra = parseFloat(String(current.retainerApplied ?? 0));
  const amountDue = Math.max(0, pb + total - pc - ra);
  await db.update(billingStatementsTable).set({ currentCharges: String(total), amountDue: String(amountDue), updatedAt: new Date() }).where(eq(billingStatementsTable.id, statementId));
}

// GET /api/portal/billing/statements/:id/available-time-entries
// Returns unbilled time entries for the statement's client/engagement (admin only, never exposed to client)
// Accepts optional ?clientId= and ?engagementId= query params to override the statement's own values
router.get("/statements/:id/available-time-entries", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [stmt] = await db.select().from(billingStatementsTable).where(eq(billingStatementsTable.id, id)).limit(1);
  if (!stmt) { res.status(404).json({ error: "Not found." }); return; }

  // Query params override the statement's own client/engagement (so the tab filter works)
  const clientId = req.query.clientId ? Number(req.query.clientId) : stmt.billingClientId;
  const engId = req.query.engagementId ? Number(req.query.engagementId) : stmt.engagementId;

  const conditions: ReturnType<typeof eq>[] = [eq(timeEntriesTable.billingStatus, "unbilled")];
  if (clientId) conditions.push(eq(timeEntriesTable.clientId, clientId));
  if (engId) conditions.push(eq(timeEntriesTable.engagementId, engId as any));

  const entries = await db
    .select({ entry: timeEntriesTable, engagementName: billingEngagementsTable.name })
    .from(timeEntriesTable)
    .leftJoin(billingEngagementsTable, eq(timeEntriesTable.engagementId as any, billingEngagementsTable.id))
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(timeEntriesTable.date))
    .limit(200);

  res.json(entries.map(e => ({ ...e.entry, engagementName: e.engagementName })));
});

export default router;
