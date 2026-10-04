# The code you must be able to explain

StayLedger is a desk API for one hotel. A guest books a room, checks in, accumulates charges, pays, and checks out. Housekeeping then cleans the room.

## Tables

- `properties` — one demo property, StayLedger Demo, in Leh
- `rooms` — number, type, status: `vacant_clean`, `vacant_dirty`, `occupied`, `out_of_order`
- `guests` — name, phone, email
- `reservations` — room, guest, check-in, check-out, status: `booked`, `checked_in`, `checked_out`, `cancelled`
- `folios` — one open bill per reservation
- `folio_lines` — a `charge` or a `payment`, description, `amount_paise`
- `housekeeping_tasks` — room, status `pending` / `in_progress` / `done`, note

A stay occupies the half-open range `[check_in, check_out)`. The morning of checkout is free for the next guest. So 10–12 Oct and 12–14 Oct on the same room are both allowed. 10–12 Oct and 11–13 Oct are not.

## Where the rule lives

`src/reservations.js`, function `createReservation`. It does this inside one database transaction:

1. `BEGIN`
2. `SELECT ... FROM rooms WHERE id = $1 FOR UPDATE` so a second request waits
3. 404 if the room is missing
4. 409 `room_out_of_order` if the room is out of order
5. 404 if the guest is missing
6. The overlap query below
7. If a row comes back: `ROLLBACK`, and **409** `room_unavailable` with `conflicting_reservation_id`
8. Otherwise insert the reservation as `booked`, insert an open folio, `COMMIT`, return **201**

```sql
SELECT id
FROM reservations
WHERE room_id = $1
  AND status <> 'cancelled'
  AND check_in < $3::date
  AND $2::date < check_out
LIMIT 1
```

`$2` is the new check-in. `$3` is the new check-out. A cancelled stay does not block the room.

Two requests can both pass a check that is not inside a transaction. Both read “no conflict,” both insert, and the room is double-sold. The lock and the transaction are the fix. The status is 409, not 400, because the input was valid and the room is simply taken.

## Check-in and check-out

`src/app.js`, function `changeStay`.

- Check-in is allowed only from `booked`. The reservation becomes `checked_in`. The room becomes `occupied`.
- Check-out is allowed only from `checked_in`. The reservation becomes `checked_out`. The room becomes `vacant_dirty`. A housekeeping task is inserted with the note `checkout clean`.

## Money

`amount_paise` is a positive integer. ₹1500 is `150000`. A float rupee drifts (0.1 + 0.2). The balance is the sum of charges minus the sum of payments. Guest and folio routes require the header `x-api-key`. Booking is open so a reviewer can curl the 409 without the key.

Local key: `dev-demo-key`. The AWS demo key, once deployed, is `stayledger-demo-key`.

## Health

`GET /health` runs `SELECT 1`. `"db":"up"` means Postgres answered. `"db":"down"` is HTTP 503.

## Tests

`npm test` runs `test/api.test.js`. Seven tests. The one to remember: overlapping stay returns 409 and the first reservation’s id. Another: a stay may start on the previous checkout morning. Another: folio balance is 150000 − 50000 = 100000.

## Files

| File | What you say |
|---|---|
| `migrations/001_init.sql` | The seven tables and the checks |
| `src/reservations.js` | The transaction and the 409 |
| `src/app.js` | Routes, folio, check-in, check-out, API key |
| `src/db.js` | Connection pool. Dates come back as `YYYY-MM-DD`, not shifted JS dates |
| `src/migrate.js` | Runs each SQL file once, recorded in `schema_migrations` |
| `src/seed.js` | Property in Leh, rooms 101 and 102 |
| `infra/template.yaml` | The AWS stack |
| `infra/deploy.ps1` | The command that creates it |

Local Postgres for this project is port **5433**, user `stayledger`, no password. It does not use the Windows service on 5432. Start it, then `npm run migrate`, `npm run seed`, `npm start`.
