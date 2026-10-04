const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseStay(checkIn, checkOut) {
  if (!DATE.test(checkIn || "") || !DATE.test(checkOut || "")) {
    return { error: "dates must be YYYY-MM-DD" };
  }
  if (checkOut <= checkIn) return { error: "check_out must be after check_in" };
  return { checkIn, checkOut };
}

// Two stays [a, b) and [c, d) overlap when a < d and c < b.
const OVERLAP_SQL = `
  SELECT id
  FROM reservations
  WHERE room_id = $1
    AND status <> 'cancelled'
    AND check_in < $3::date
    AND $2::date < check_out
  LIMIT 1
`;

export async function createReservation(pool, { roomId, guestId, checkIn, checkOut }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const room = await client.query("SELECT id, status FROM rooms WHERE id = $1 FOR UPDATE", [roomId]);
    if (room.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: 404, body: { error: "room_not_found" } };
    }
    if (room.rows[0].status === "out_of_order") {
      await client.query("ROLLBACK");
      return { status: 409, body: { error: "room_out_of_order" } };
    }
    const guest = await client.query("SELECT id FROM guests WHERE id = $1", [guestId]);
    if (guest.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: 404, body: { error: "guest_not_found" } };
    }
    const conflict = await client.query(OVERLAP_SQL, [roomId, checkIn, checkOut]);
    if (conflict.rowCount > 0) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: {
          error: "room_unavailable",
          conflicting_reservation_id: conflict.rows[0].id,
        },
      };
    }
    const inserted = await client.query(
      `INSERT INTO reservations (room_id, guest_id, check_in, check_out, status)
       VALUES ($1, $2, $3, $4, 'booked')
       RETURNING id, room_id, guest_id, check_in, check_out, status`,
      [roomId, guestId, checkIn, checkOut],
    );
    await client.query(
      "INSERT INTO folios (reservation_id, status) VALUES ($1, 'open')",
      [inserted.rows[0].id],
    );
    await client.query("COMMIT");
    return { status: 201, body: { reservation: rowDates(inserted.rows[0]) } };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function rowDates(row) {
  return {
    ...row,
    check_in: isoDate(row.check_in),
    check_out: isoDate(row.check_out),
  };
}

function isoDate(value) {
  if (!value) return value;
  if (typeof value === "string") return value.slice(0, 10);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}
