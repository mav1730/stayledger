# Resume — paste this

One page. PDF name: `Yash-Mishra-Backend.pdf`.

Put your phone on the header line. The email below is the one on your GitHub profile.

**Do not include the AWS CloudFormation skill, and do not include a live URL, until file 03’s health check is green.** Before that, use the “before AWS” version.

## Before AWS is live

```
YASH MISHRA
Backend development · Node.js · PostgreSQL · Python · REST API
Navi Mumbai · Work from home · can start immediately · 6 months
github.com/mav1730 · github.com/mav1730/stayledger · ym151730@gmail.com · phone
```

Summary

Third-year B.Tech CSE at SIES Graduate School of Technology. Built StayLedger, a Node.js and PostgreSQL API for hotel rooms, reservations, guest folios, and housekeeping. Overlapping a booked stay returns 409 from inside a transaction, and that case is tested. Also built MetroCheck, a Python REST API with pytest and written API docs. Available to start before 16 Oct 2026 and work from home for six months.

Skills

Backend development · Node.js · PostgreSQL · Python · REST API · GitHub

Projects

StayLedger — hotel property API · Node.js, PostgreSQL, REST · github.com/mav1730/stayledger

- Endpoints for rooms, reservations, guests, folios, and housekeeping for one property.
- Reservation create locks the room, runs in a transaction, and returns 409 when the dates overlap an active stay.
- Folio lines are paise. The balance is charges minus payments. Checkout marks the room dirty and opens a housekeeping task.
- CloudFormation template in the repo: EC2, private RDS, SSM for the database password. Deploy is the next step; I am not claiming a live URL yet.

Use that last bullet only if they ask and the stack is still not up. If you would rather not mention CloudFormation at all until it is live, delete that bullet. A live URL you have curled is stronger than a template you have not run.

MetroCheck — compliance API · Python, Flask, REST, pytest · github.com/mav1730/LEGAL-METROLOGY-PROJECT

- REST API to scan a listing, store fields, accept a human review, and export JSON or PDF.
- Compliance rules stay deterministic. pytest covers the pipeline.
- README documents the endpoints, how to start the service, and what the tool does not decide.

Education

SIES Graduate School of Technology, Navi Mumbai
B.Tech, Computer Science and Engineering, 3rd year, expected 2028

Add a CGPA only if you type the real number from your marksheet.

## After you have curled the live health check

Replace the header skill line with:

```
Backend development · Node.js · PostgreSQL · Python · REST API · AWS CloudFormation
```

Replace the StayLedger link with `http://<eip>`.

Replace the StayLedger bullets with:

- CloudFormation stack in ap-south-1: EC2, private RDS Postgres, SSM for the DB password, Elastic IP. I ran the deploy from the CLI.
- Endpoints for rooms, reservations, guests, folios, and housekeeping. Overlapping an active stay returns 409 from inside a transaction.
- Folio lines are paise. The balance endpoint sums charges minus payments. Room status moves through vacant, occupied, and dirty.
- GET /health checks the database. The README has the stack name and curls against the live host.

Add AWS CloudFormation to the skills line, after GitHub.
