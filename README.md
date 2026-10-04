# StayLedger

Single-property hotel desk API for rooms, reservations, guest folios, and housekeeping.

Public repo: https://github.com/mav1730/stayledger

Read `docs/read/00-start-here.md` first if you are applying to the SuperStay internship. The files in `docs/read/` are numbered.

Node.js and PostgreSQL. The AWS copy is one CloudFormation stack in `ap-south-1`: EC2 for the API, private RDS for Postgres, the database password in SSM, and an Elastic IP. There is no NAT gateway and no load balancer. The live URL is HTTP on port 80 and is added here after `infra/deploy.ps1` succeeds.

## What is not built

One property. No Booking.com or MakeMyTrip sync. No payment gateway. No point of sale. No HTTPS certificate.

## Local run

Postgres for this repo listens on port 5433 so it does not touch the Windows PostgreSQL service on 5432. Start it in a terminal and leave it running:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "C:\Users\admin\Documents\stayledger\.pgdata" -p 5433 -h 127.0.0.1
```

The data directory is created with `initdb` if `.pgdata` is missing (`-U stayledger --auth=trust`). Then:

```powershell
copy .env.example .env
npm install
npm run migrate
npm run seed
npm start
npm test
```

`GET /health` checks the database. A green health check means Postgres answered.

## API

Guest and folio routes need the header `x-api-key`. Locally that key is `dev-demo-key`. Booking is open so the overlap rule can be curled without the key.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `{ ok, db }` |
| GET | `/properties` | the demo property |
| GET | `/rooms` | rooms and ids |
| POST | `/rooms` | `{ property_id, number, room_type }` |
| PATCH | `/rooms/:id/status` | `vacant_clean`, `vacant_dirty`, `occupied`, `out_of_order` |
| POST | `/guests` | `{ full_name, phone, email }` |
| POST | `/reservations` | 201, or 409 when the room is already taken |
| POST | `/reservations/:id/check-in` | room becomes `occupied` |
| POST | `/reservations/:id/check-out` | room becomes `vacant_dirty`, housekeeping task opens |
| GET | `/reservations/:id/folio` | lines and `balance_paise` |
| POST | `/reservations/:id/folio/charges` | `{ description, amount_paise }` |
| POST | `/reservations/:id/folio/payments` | `{ description, amount_paise }` |
| GET | `/housekeeping?status=` | tasks |
| POST | `/housekeeping` | `{ room_id, note }` |
| PATCH | `/housekeeping/:id` | `pending`, `in_progress`, `done` |

A stay occupies `[check_in, check_out)`. The checkout morning can be sold to the next guest. Money is an integer number of paise, because a float rupee drifts.

Overlap, inside one transaction that locks the room row:

```sql
SELECT id FROM reservations
WHERE room_id = $1
  AND status <> 'cancelled'
  AND check_in < $3::date
  AND $2::date < check_out
```

`$2` is the new check-in and `$3` is the new check-out. A hit returns **409** with `conflicting_reservation_id`.

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/rooms
curl -X POST http://127.0.0.1:3000/guests -H "content-type: application/json" -H "x-api-key: dev-demo-key" -d "{\"full_name\":\"Asha\"}"
curl -X POST http://127.0.0.1:3000/reservations -H "content-type: application/json" -d "{\"room_id\":\"<room>\",\"guest_id\":\"<guest>\",\"check_in\":\"2026-10-10\",\"check_out\":\"2026-10-12\"}"
curl -X POST http://127.0.0.1:3000/reservations -H "content-type: application/json" -d "{\"room_id\":\"<room>\",\"guest_id\":\"<guest>\",\"check_in\":\"2026-10-11\",\"check_out\":\"2026-10-13\"}"
curl http://127.0.0.1:3000/reservations/<id>/folio -H "x-api-key: dev-demo-key"
curl -X POST http://127.0.0.1:3000/reservations/<id>/folio/charges -H "content-type: application/json" -H "x-api-key: dev-demo-key" -d "{\"description\":\"room\",\"amount_paise\":150000}"
```

The second reservation is the 409.

## AWS

Region `ap-south-1`. Stack name `stayledger`. Template: `infra/template.yaml`.

- EC2 `t3.micro`, Amazon Linux 2023, Node 20, systemd unit `stayledger`
- RDS PostgreSQL 16, `db.t4g.micro`, 20 GB, not publicly accessible
- Port 5432 is open only from the API security group
- Port 22 is open only from your IP at deploy time
- Port 80 is public
- DB password is an SSM SecureString at `/stayledger/db-password`. CloudFormation cannot create a SecureString, so `infra/deploy.ps1` writes it and passes the same value to RDS as a `NoEcho` parameter. User-data reads SSM. The password is not in git.
- Demo API key on the instance: `stayledger-demo-key`

Before the first deploy:

1. AWS account, root MFA, an IAM user, `aws configure`, and a billing alarm at $10.
2. EC2 key pair named `stayledger` in `ap-south-1`.
3. This repo public at `https://github.com/mav1730/stayledger`. User-data clones that URL. It does not run again when the template changes.
4. `powershell -File infra/deploy.ps1`

`CREATE_COMPLETE` means the instance and RDS exist. The app is up after user-data finishes. SSH in and read `/var/log/stayledger-bootstrap.log`. Then curl `http://<eip>/health` and the overlap request against that host.

A later code change is: SSH, `git pull`, `npm ci --omit=dev`, `node src/migrate.js`, `systemctl restart stayledger`.

To stop the bill:

```bash
aws cloudformation delete-stack --stack-name stayledger --region ap-south-1
```

Free Tier, on an account younger than 12 months, covers the `t3.micro` and a micro RDS instance. An older account is about $20–25 a month for this pair. A NAT gateway is not in the template; that alone is about $32 a month.
