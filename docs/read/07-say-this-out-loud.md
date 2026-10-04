# Say this out loud

Close the README. Answer in your own words. If you cannot, open the file named on the right, read that section once, close it, and answer again.

1. Draw the seven tables and say which id points at which table. (`02`)
2. A guest wants 11–13 Oct. The room already has 10–12 Oct. What do you return, and why is it not a 400? (`02`)
3. Why is the check inside a transaction with `FOR UPDATE`? (`02`)
4. May a new stay start on the old checkout date? Why? (`02`)
5. What is a folio, in one sentence? What is `balance_paise` for a 150000 charge and a 50000 payment? (`02`)
6. What does check-out change on the room, and what row appears in housekeeping? (`02`)
7. Who can reach port 5432? Where does the database password live? (`03`)
8. What is the difference between the YAML file and the running stack? (`03`)
9. `CREATE_COMPLETE` is showing, and `/health` is still down. What do you look at? (`03`)
10. How do you ship a one-line bugfix the next day, and how do you delete the stack so it stops costing money? (`03`)
11. You have not worked in a hotel. What do you say instead? (`01` and the cover letter)
12. What does an OTA channel manager do, and what would you add first? An availability read, plus an idempotency key, so Booking.com and the desk cannot sell the same night twice. You have not built that. Say so.

When all twelve come out cleanly, you are ready for the call. On the call, share the screen on three things only: the overlap function, `infra/template.yaml`, and a curl against the live host if it exists.
