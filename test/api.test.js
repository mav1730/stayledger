import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../src/db.js";
import { migrate } from "../src/migrate.js";
import { createApp } from "../src/app.js";

const API_KEY = "test-key";
const pool = createPool("postgres://stayledger@127.0.0.1:5433/stayledger_test");
let base;
let server;

before(async () => {
  await migrate(pool);
  const app = createApp(pool, { apiKey: API_KEY });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await pool.query(`
    TRUNCATE folio_lines, folios, reservations, housekeeping_tasks, guests, rooms, properties
    RESTART IDENTITY CASCADE
  `);
});

test("malformed JSON is a 400", async () => {
  const response = await fetch(`${base}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_json" });
});

test("health reports the database is up", async () => {
  const body = await get("/health");
  assert.equal(body.status, 200);
  assert.deepEqual(body.json, { ok: true, db: "up" });
});

test("overlapping stay on the same room returns 409", async () => {
  const { roomId, guestId } = await setupRoom();
  const first = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  assert.equal(first.status, 201);

  const second = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-11",
    check_out: "2026-10-13",
  });
  assert.equal(second.status, 409);
  assert.equal(second.json.error, "room_unavailable");
  assert.equal(second.json.conflicting_reservation_id, first.json.reservation.id);
});

test("a stay may start on the previous checkout morning", async () => {
  const { roomId, guestId } = await setupRoom();
  const first = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  const next = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-12",
    check_out: "2026-10-14",
  });
  assert.equal(first.status, 201);
  assert.equal(next.status, 201);
});

test("a cancelled stay does not block the room", async () => {
  const { roomId, guestId } = await setupRoom();
  const first = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [
    first.json.reservation.id,
  ]);
  const again = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  assert.equal(again.status, 201);
});

test("folio balance is charges minus payments, in paise", async () => {
  const { roomId, guestId } = await setupRoom();
  const stay = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  const id = stay.json.reservation.id;
  const locked = await get(`/reservations/${id}/folio`);
  assert.equal(locked.status, 401);

  const charged = await post(
    `/reservations/${id}/folio/charges`,
    { description: "room", amount_paise: 150000 },
    API_KEY,
  );
  assert.equal(charged.status, 201);
  assert.equal(charged.json.balance_paise, 150000);

  const paid = await post(
    `/reservations/${id}/folio/payments`,
    { description: "upi", amount_paise: 50000 },
    API_KEY,
  );
  assert.equal(paid.json.balance_paise, 100000);

  const rejected = await post(
    `/reservations/${id}/folio/charges`,
    { description: "bad", amount_paise: 1.5 },
    API_KEY,
  );
  assert.equal(rejected.status, 400);
});

test("check-out marks the room dirty and opens a housekeeping task", async () => {
  const { roomId, guestId } = await setupRoom();
  const stay = await post("/reservations", {
    room_id: roomId,
    guest_id: guestId,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
  });
  const id = stay.json.reservation.id;
  const inResult = await post(`/reservations/${id}/check-in`, {});
  assert.equal(inResult.json.reservation.status, "checked_in");
  const outResult = await post(`/reservations/${id}/check-out`, {});
  assert.equal(outResult.json.reservation.status, "checked_out");

  const rooms = await get("/rooms");
  assert.equal(rooms.json.rooms[0].status, "vacant_dirty");
  const tasks = await get("/housekeeping?status=pending");
  assert.equal(tasks.json.tasks.length, 1);
  assert.equal(tasks.json.tasks[0].room_id, roomId);
});

async function setupRoom() {
  const property = await pool.query(
    "INSERT INTO properties (name, city) VALUES ('Demo', 'Leh') RETURNING id",
  );
  const room = await pool.query(
    `INSERT INTO rooms (property_id, number, room_type, status)
     VALUES ($1, '101', 'deluxe', 'vacant_clean') RETURNING id`,
    [property.rows[0].id],
  );
  const guest = await pool.query(
    "INSERT INTO guests (full_name) VALUES ('Asha') RETURNING id",
  );
  return { roomId: room.rows[0].id, guestId: guest.rows[0].id };
}

async function get(pathname, apiKey) {
  const response = await fetch(`${base}${pathname}`, { headers: headers(apiKey) });
  return { status: response.status, json: await response.json() };
}

async function post(pathname, body, apiKey) {
  const response = await fetch(`${base}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers(apiKey) },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

function headers(apiKey) {
  return apiKey ? { "x-api-key": apiKey } : {};
}
