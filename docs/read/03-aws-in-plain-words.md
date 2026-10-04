# AWS, in the words you will use

The template is `infra/template.yaml`. Stack name `stayledger`. Region `ap-south-1` (Mumbai).

Say this:

“I wrote one CloudFormation template. It creates a small EC2 instance for the Node API and a private RDS Postgres database. The database password is in SSM. The API has an Elastic IP. I deploy it with the AWS CLI. There is no NAT gateway and no load balancer.”

## What each piece is

| Piece | Plain meaning |
|---|---|
| CloudFormation stack | One file that creates and deletes the whole setup together |
| Template vs stack | The YAML is the template. The running resources are the stack |
| EC2 `t3.micro` | The machine that runs Node, port 80 |
| RDS `db.t4g.micro` | Managed Postgres. Not public. Port 5432 accepts traffic only from the API security group |
| Security group | A firewall. Port 80 is open to the world. Port 22 is open only to your IP at deploy time. Port 5432 is open only to the API |
| SSM `/stayledger/db-password` | The password. CloudFormation cannot create a SecureString, so `deploy.ps1` writes it, and the instance reads it on boot. It is not in git |
| Elastic IP | A stable public address. The resume URL is `http://<that-ip>/health` |
| User-data | A script that runs **once**, the first time the instance boots: install Node 20, clone `github.com/mav1730/stayledger`, migrate, seed, start systemd |
| systemd unit `stayledger` | Restarts the API if it crashes |

`CREATE_COMPLETE` means EC2 and RDS exist. It does not mean the app is up. User-data is still cloning the repo. The log is `/var/log/stayledger-bootstrap.log`.

A later code change is not a new stack. SSH in, `git pull`, `npm ci --omit=dev`, `node src/migrate.js`, `systemctl restart stayledger`. Changing the template does not re-run user-data on an instance that already exists.

Delete it when SuperStay has replied and you are not using it:

```powershell
aws cloudformation delete-stack --stack-name stayledger --region ap-south-1
```

## Cost, so you are not surprised

A new AWS account on the **Free** plan gives $100 in credits and does not charge the card. This stack burns about $1 a day of those credits. Choose Free, not Paid.

An account you already had does not get that plan. Then this stack is about $30 a month until you delete it.

## If `/health` says the database is down

Look in this order: RDS status in the console, the API security group is the only source on port 5432, `DATABASE_URL` in `/opt/stayledger/.env`, then whether `node src/migrate.js` finished in the bootstrap log.

## Current truth

As of this file, the stack has **not** been deployed from this laptop. There is no AWS credential here. Do not tell Internshala the URL until you have curled `/health` and the overlap 409 against that IP yourself.
