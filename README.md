# Rahul's Gym Log

Daily gym checklist built from Sandeep's split, matched to the machines at the gym.
Plain HTML, CSS and JavaScript. No build step, no backend, no accounts.

## What it does

- PIN lock (4 digits). Opens as soon as the 4th digit is right, then stays open for 12 hours on that phone.
- Today tab: the checklist for today's weekday. Every new day starts a fresh list.
  - Monday and Thursday: biceps + triceps
  - Tuesday and Friday: chest + shoulders
  - Wednesday: back + light legs
  - Saturday: legs focus + 1 back exercise
  - Sunday: rest day (walk, weigh in, stretch)
- Each exercise card: tick box, set buttons (tapping a set starts the rest timer), kg box.
- Bonus exercises are shown every day under the main workout. Do them when your body allows; they do not lower your score if skipped.
- Reminder card when you open the app: yesterday missed or half done, morning window (6 to 10 AM) passed with nothing ticked, or items still left for an evening session.
- Each kg box shows what you lifted last time, so you can add weight step by step.
- Watch how to do it link under every exercise, plus a full Watch list in the Plan tab.
- Steps box each day: type the number from your phone's step counter. Hitting 8,000 ticks the steps habit by itself.
- Cardio and daily habits (water, steps, sleep, no junk) as tick boxes. Diet plan is an optional fold-out section.
- Notes for each day.
- Report tab: weekly report for Monday to Sunday with workout score, days trained, sets, streak, habits, meals,
  day-by-day status with steps, missed exercises, best weights vs last week, body weight, notes.
  Download it as a PDF or a Word (.doc) file, or copy it as text. On Sunday the app reminds you the report is ready.
  The PDF maker (jsPDF) loads from cdnjs only when you tap Download PDF, so the app stays light.
- Plan tab: the full week, watch list, rules, backup download/restore, lock, erase.
- Can be added to the phone home screen like an app.

## Where the data lives

Everything is stored in the browser on the phone you use (localStorage). Nothing is sent to any server.
Use the same phone and browser every day. Use Plan > Download backup to keep a copy or move to a new phone.

## Change the PIN

The PIN is stored as a SHA-256 hash in `app.js` (`PIN_HASH`). To change it:

    printf '1234' | sha256sum

Paste the result into `PIN_HASH`, and change the fallback `atob('...')` string to `btoa('1234')`.
This is a simple screen lock to keep the page private on your phone, not bank-level security.

## Change exercises or meals

Edit `data.js`. Each exercise is one `ex(...)` line: id, name, machine, sets, reps, rest seconds, tip, video search words, bonus level.

## Run locally

    npx serve .

Then open http://localhost:3000

## Deploy on Vercel

1. Push this folder to a new GitHub repo:

       git init
       git add .
       git commit -m "Gym log"
       git branch -M main
       git remote add origin https://github.com/<you>/rahul-gym-log.git
       git push -u origin main

2. On vercel.com: Add New > Project > import the repo.
3. Framework preset: Other. Build command: leave empty. Output directory: leave empty (root).
4. Deploy. Open the link on your phone, enter the PIN, then Share > Add to Home Screen.

Or from this folder: `npx vercel --prod`.
