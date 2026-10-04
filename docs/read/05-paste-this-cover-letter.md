# Cover letter — paste this

Internshala has a cover-letter box. Paste one of these. Do not add a paragraph about being passionate.

## Before the Elastic IP exists

I can start immediately, work from home, and continue for six months. I built StayLedger for this role: a Node.js and PostgreSQL API at https://github.com/mav1730/stayledger. It covers the objects in your posting — rooms, reservations, guests, folios, and housekeeping. Booking a room that already has an overlapping stay returns 409 from inside a transaction, and that case is tested. The repo includes a CloudFormation template for EC2 and a private RDS instance; I will put the live URL here as soon as that stack is up. I have not worked in a hotel. I built the slice I would be maintaining.

## After you have curled `/health` and the live 409

I can start immediately, work from home, and continue for six months. I deployed StayLedger myself on AWS with CloudFormation: Node.js on EC2, PostgreSQL on RDS, stack stayledger in ap-south-1, live at http://<eip>/health. The API covers the objects in your posting — rooms, reservations, guests, folios, and housekeeping. Booking a room that already has an overlapping stay returns 409 from inside a transaction, and that case is tested. The database is private; only the API security group can reach port 5432, and the DB password sits in SSM. I have not worked in a hotel. I built the slice I would be maintaining, including how I ship a change (pull, migrate, restart the systemd unit) and how the stack is deleted. GitHub: https://github.com/mav1730/stayledger
