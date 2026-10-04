# Read these in order

Deadline: submit the Internshala application on **10 Oct 2026**. The posting closes **11 Oct 2026**.

Read one file, then the next. Do not skip ahead to the resume.

| Order | File | Why it exists |
|---|---|---|
| 1 | `01-what-they-check.md` | The three things SuperStay actually screens |
| 2 | `02-the-code-you-must-explain.md` | StayLedger, file by file, in the words you will use |
| 3 | `03-aws-in-plain-words.md` | The CloudFormation stack, and what is still not live |
| 4 | `04-paste-this-resume.md` | The exact resume text |
| 5 | `05-paste-this-cover-letter.md` | The exact cover letter |
| 6 | `06-internshala-clicks.md` | What to click, in order |
| 7 | `07-say-this-out-loud.md` | Close the laptop and answer these |

Repo: https://github.com/mav1730/stayledger

Code on this laptop: `C:\Users\admin\Documents\stayledger`

## What is already done

- The API, the tests, the CloudFormation template, and this reading set are in that repo.
- GitHub is public, so a reviewer can open it.

## What is not done

This PC has no AWS account configured. The Elastic IP does not exist yet. Until `http://<that-ip>/health` returns `"db":"up"`, the resume must not say the app is deployed on AWS.

The one step that needs you, because it asks for a card:

1. Create an AWS account and choose the **Free** plan, not Paid. A new Free plan gives $100 in credits and does not bill the card. This stack uses about $1 a day of those credits while it is on.
2. Install is handled on this machine once the AWS CLI finishes installing. Then run `aws configure` with the access key from that account, region `ap-south-1`.
3. In the EC2 console for Mumbai, create a key pair named `stayledger`.
4. Tell me when those two exist. The deploy command is `powershell -File infra\deploy.ps1`.

After the health URL is green, put it into files 04 and 05, then do file 06.
