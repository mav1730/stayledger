import pg from "pg";

const { Pool } = pg;

// Return DATE columns as YYYY-MM-DD. The default parser builds a JS Date at UTC
// midnight, which shifts the calendar day in timezones behind UTC.
pg.types.setTypeParser(1082, (value) => value);

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  return new Pool({ connectionString });
}
