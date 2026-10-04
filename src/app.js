import express from "express";
import { timingSafeEqual } from "node:crypto";
import { createReservation, parseStay, rowDates } from "./reservations.js";

const ROOM_STATUS = ["vacant_clean", "vacant_dirty", "occupied", "out_of_order"];
const TASK_STATUS = ["pending", "in_progress", "done"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createApp(pool, { apiKey = process.env.API_KEY } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/health", asyncRoute(async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: "up" });
    } catch {
      res.status(503).json({ ok: false, db: "down" });
    }
  }));

  app.get("/properties", asyncRoute(async (_req, res) => {
    const result = await pool.query("SELECT id, name, city FROM properties ORDER BY name");
    res.json({ properties: result.rows });
  }));

  app.get("/rooms", asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT id, property_id, number, room_type, status
       FROM rooms
       ORDER BY number`,
    );
    res.json({ rooms: result.rows });
  }));

  app.post("/rooms", asyncRoute(async (req, res) => {
    const { property_id: propertyId, number, room_type: roomType } = req.body ?? {};
    if (!UUID.test(propertyId || "") || !number || !roomType) {
      return res.status(400).json({ error: "property_id, number, and room_type are required" });
    }
    try {
      const result = await pool.query(
        `INSERT INTO rooms (property_id, number, room_type, status)
         VALUES ($1, $2, $3, 'vacant_clean')
         RETURNING id, property_id, number, room_type, status`,
        [propertyId, String(number), String(roomType)],
      );
      res.status(201).json({ room: result.rows[0] });
    } catch (error) {
      sendPgError(res, error);
    }
  }));

  app.patch("/rooms/:id/status", asyncRoute(async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: "invalid id" });
    const status = req.body?.status;
    if (!ROOM_STATUS.includes(status)) {
      return res.status(400).json({ error: "invalid status", allowed: ROOM_STATUS });
    }
    const result = await pool.query(
      `UPDATE rooms SET status = $2 WHERE id = $1
       RETURNING id, property_id, number, room_type, status`,
      [req.params.id, status],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "room_not_found" });
    res.json({ room: result.rows[0] });
  }));

  app.post("/guests", requireApiKey(apiKey), asyncRoute(async (req, res) => {
    const name = req.body?.full_name?.trim();
    if (!name) return res.status(400).json({ error: "full_name is required" });
    const result = await pool.query(
      `INSERT INTO guests (full_name, phone, email)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, phone, email`,
      [name, req.body.phone ?? null, req.body.email ?? null],
    );
    res.status(201).json({ guest: result.rows[0] });
  }));

  app.post("/reservations", asyncRoute(async (req, res) => {
    const { room_id: roomId, guest_id: guestId } = req.body ?? {};
    if (!UUID.test(roomId || "") || !UUID.test(guestId || "")) {
      return res.status(400).json({ error: "room_id and guest_id must be uuids" });
    }
    const stay = parseStay(req.body.check_in, req.body.check_out);
    if (stay.error) return res.status(400).json({ error: stay.error });
    const outcome = await createReservation(pool, {
      roomId,
      guestId,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
    });
    res.status(outcome.status).json(outcome.body);
  }));

  app.post("/reservations/:id/check-in", asyncRoute(async (req, res) => {
    const outcome = await changeStay(pool, req.params.id, "check-in");
    res.status(outcome.status).json(outcome.body);
  }));

  app.post("/reservations/:id/check-out", asyncRoute(async (req, res) => {
    const outcome = await changeStay(pool, req.params.id, "check-out");
    res.status(outcome.status).json(outcome.body);
  }));

  app.get("/reservations/:id/folio", requireApiKey(apiKey), asyncRoute(async (req, res) => {
    const folio = await loadFolio(pool, req.params.id);
    if (folio.error) return res.status(folio.status).json({ error: folio.error });
    res.json(folio.body);
  }));

  app.post("/reservations/:id/folio/charges", requireApiKey(apiKey), asyncRoute(async (req, res) => {
    const outcome = await addLine(pool, req.params.id, "charge", req.body);
    res.status(outcome.status).json(outcome.body);
  }));

  app.post("/reservations/:id/folio/payments", requireApiKey(apiKey), asyncRoute(async (req, res) => {
    const outcome = await addLine(pool, req.params.id, "payment", req.body);
    res.status(outcome.status).json(outcome.body);
  }));

  app.get("/housekeeping", asyncRoute(async (req, res) => {
    const status = req.query.status;
    if (status && !TASK_STATUS.includes(status)) {
      return res.status(400).json({ error: "invalid status", allowed: TASK_STATUS });
    }
    const result = status
      ? await pool.query(
        `SELECT id, room_id, status, note, created_at
         FROM housekeeping_tasks WHERE status = $1 ORDER BY created_at`,
        [status],
      )
      : await pool.query(
        `SELECT id, room_id, status, note, created_at
         FROM housekeeping_tasks ORDER BY created_at`,
      );
    res.json({ tasks: result.rows });
  }));

  app.post("/housekeeping", asyncRoute(async (req, res) => {
    const roomId = req.body?.room_id;
    if (!UUID.test(roomId || "")) return res.status(400).json({ error: "room_id must be a uuid" });
    try {
      const result = await pool.query(
        `INSERT INTO housekeeping_tasks (room_id, status, note)
         VALUES ($1, 'pending', $2)
         RETURNING id, room_id, status, note, created_at`,
        [roomId, req.body.note ?? null],
      );
      res.status(201).json({ task: result.rows[0] });
    } catch (error) {
      sendPgError(res, error);
    }
  }));

  app.patch("/housekeeping/:id", asyncRoute(async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: "invalid id" });
    const status = req.body?.status;
    if (!TASK_STATUS.includes(status)) {
      return res.status(400).json({ error: "invalid status", allowed: TASK_STATUS });
    }
    const result = await pool.query(
      `UPDATE housekeeping_tasks SET status = $2 WHERE id = $1
       RETURNING id, room_id, status, note, created_at`,
      [req.params.id, status],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "task_not_found" });
    res.json({ task: result.rows[0] });
  }));

  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "invalid_json" });
    }
    console.error(error);
    res.status(500).json({ error: "internal" });
  });

  return app;
}

function requireApiKey(apiKey) {
  return (req, res, next) => {
    const provided = req.get("x-api-key") ?? "";
    if (!apiKey || !safeEqual(provided, apiKey)) {
      return res.status(401).json({ error: "invalid_api_key" });
    }
    next();
  };
}

function safeEqual(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function sendPgError(res, error) {
  if (error.code === "23503") return res.status(400).json({ error: "related_row_missing" });
  if (error.code === "23505") return res.status(409).json({ error: "already_exists" });
  if (error.code === "22P02") return res.status(400).json({ error: "invalid id" });
  throw error;
}

async function changeStay(pool, reservationId, action) {
  if (!UUID.test(reservationId || "")) return { status: 400, body: { error: "invalid id" } };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT id, room_id, status FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId],
    );
    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: 404, body: { error: "reservation_not_found" } };
    }
    const row = current.rows[0];
    if (action === "check-in" && row.status !== "booked") {
      await client.query("ROLLBACK");
      return { status: 409, body: { error: "not_booked" } };
    }
    if (action === "check-out" && row.status !== "checked_in") {
      await client.query("ROLLBACK");
      return { status: 409, body: { error: "not_checked_in" } };
    }
    const next = action === "check-in" ? "checked_in" : "checked_out";
    const roomStatus = action === "check-in" ? "occupied" : "vacant_dirty";
    const updated = await client.query(
      `UPDATE reservations SET status = $2 WHERE id = $1
       RETURNING id, room_id, guest_id, check_in, check_out, status`,
      [reservationId, next],
    );
    await client.query("UPDATE rooms SET status = $2 WHERE id = $1", [row.room_id, roomStatus]);
    if (action === "check-out") {
      await client.query(
        `INSERT INTO housekeeping_tasks (room_id, status, note)
         VALUES ($1, 'pending', 'checkout clean')`,
        [row.room_id],
      );
    }
    await client.query("COMMIT");
    return { status: 200, body: { reservation: rowDates(updated.rows[0]) } };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadFolio(pool, reservationId) {
  if (!UUID.test(reservationId || "")) return { status: 400, error: "invalid id" };
  const folio = await pool.query(
    "SELECT id, reservation_id, status FROM folios WHERE reservation_id = $1",
    [reservationId],
  );
  if (folio.rowCount === 0) return { status: 404, error: "folio_not_found" };
  const lines = await pool.query(
    `SELECT id, kind, description, amount_paise, created_at
     FROM folio_lines WHERE folio_id = $1 ORDER BY created_at, id`,
    [folio.rows[0].id],
  );
  const balance = lines.rows.reduce((sum, line) => {
    return sum + (line.kind === "charge" ? line.amount_paise : -line.amount_paise);
  }, 0);
  return { body: { folio: folio.rows[0], lines: lines.rows, balance_paise: balance } };
}

async function addLine(pool, reservationId, kind, body) {
  if (!UUID.test(reservationId || "")) return { status: 400, body: { error: "invalid id" } };
  const amount = body?.amount_paise;
  const description = body?.description?.trim();
  if (!Number.isInteger(amount) || amount <= 0) {
    return { status: 400, body: { error: "amount_paise must be a positive integer" } };
  }
  if (!description) return { status: 400, body: { error: "description is required" } };
  const folio = await pool.query(
    "SELECT id, status FROM folios WHERE reservation_id = $1",
    [reservationId],
  );
  if (folio.rowCount === 0) return { status: 404, body: { error: "folio_not_found" } };
  if (folio.rows[0].status !== "open") return { status: 409, body: { error: "folio_closed" } };
  await pool.query(
    `INSERT INTO folio_lines (folio_id, kind, description, amount_paise)
     VALUES ($1, $2, $3, $4)`,
    [folio.rows[0].id, kind, description, amount],
  );
  return { status: 201, body: (await loadFolio(pool, reservationId)).body };
}
