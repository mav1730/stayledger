# Yash Mishra — resume text for the SuperStay application

Use this after the Elastic IP answers `/health`. Until then, leave AWS CloudFormation off the Internshala skill list and leave the URL line as "deploy in progress".

```
YASH MISHRA
Backend development · Node.js · PostgreSQL · Python · REST API · AWS CloudFormation
Navi Mumbai · Work from home · can start immediately · 6 months
github.com/mav1730 · http://<eip> · phone · email
```

Internshala headline: Backend development | Node.js, PostgreSQL, AWS CloudFormation

Summary

Third-year B.Tech CSE at SIES Graduate School of Technology. Deployed StayLedger myself with AWS CloudFormation: a Node.js API on EC2 and PostgreSQL on RDS, covering rooms, reservations, guest folios, and housekeeping. Also built MetroCheck, a Python REST API with pytest and written API docs. Available to start before 16 Oct 2026 and work from home for six months.

Skills

Backend development · Node.js · PostgreSQL · Python · REST API · GitHub · AWS CloudFormation

Express, SQL, EC2, RDS, SSM, Flask, pytest

Projects

StayLedger — hotel property API · Node.js, PostgreSQL, AWS CloudFormation · http://<eip> · github.com/mav1730/stayledger

- CloudFormation stack in ap-south-1: EC2 (Amazon Linux), private RDS Postgres, SSM for the DB password, Elastic IP. I ran the deploy from the CLI.
- Endpoints for rooms, reservations, guests, folios, and housekeeping. Overlapping an active stay returns 409 from inside a transaction.
- Folio lines are paise; the balance endpoint sums charges minus payments. Room status moves through vacant, occupied, and dirty.
- GET /health checks the database. README has the stack name, curls against the live host, and the update path.

MetroCheck — compliance API · Python, Flask, REST, pytest · github.com/mav1730/LEGAL-METROLOGY-PROJECT

- REST API to scan a listing, store fields, accept a human review, and export JSON or PDF.
- Rules stay deterministic; pytest covers the pipeline.
- README documents endpoints, how to start the service, and what the tool does not decide.

Education

SIES Graduate School of Technology, Navi Mumbai
B.Tech, Computer Science and Engineering, 3rd year, expected 2028

Put a CGPA on the page only if you type the real number.
