import { pathToFileURL } from "node:url";
import { loadEnv } from "./env.js";
import { createPool } from "./db.js";
import { migrate } from "./migrate.js";

loadEnv();

export async function seed(pool) {
  const existing = await pool.query("SELECT id FROM properties WHERE name = $1", ["StayLedger Demo"]);
  if (existing.rowCount > 0) return existing.rows[0].id;

  const property = await pool.query(
    "INSERT INTO properties (name, city) VALUES ($1, $2) RETURNING id",
    ["StayLedger Demo", "Leh"],
  );
  const propertyId = property.rows[0].id;
  for (const room of [
    ["101", "deluxe"],
    ["102", "standard"],
  ]) {
    await pool.query(
      `INSERT INTO rooms (property_id, number, room_type, status)
       VALUES ($1, $2, $3, 'vacant_clean')`,
      [propertyId, room[0], room[1]],
    );
  }
  return propertyId;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool();
  try {
    await migrate(pool);
    const id = await seed(pool);
    console.log(`seeded property ${id}`);
  } finally {
    await pool.end();
  }
}
