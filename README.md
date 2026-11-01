# Rahul's Gym Log

Daily gym checklist built from a weekly split, matched to the machines at the gym.
Plain HTML, CSS and JavaScript. No build step, no backend, no accounts.

## What it does

- PIN lock (4 digits). Opens as soon as the 4th digit is right, then stays open for 12 hours on that phone.
- Today tab: the checklist for today's weekday. Every new day starts a fresh list.
  - Balanced intermediate week (from 1 Nov 2026), every muscle twice a week:
  - Monday: chest (heavy) + triceps + side delts + abs
  - Tuesday: back width + biceps + rear delts
  - Wednesday: legs, quad focus + calves + abs
  - Thursday: shoulders + back (thickness, rear delts)
  - Friday: upper chest + arms in supersets + plank
  - Saturday: legs, glutes + hamstrings (Smith hip thrust and 45 degree back extension instead of the Romanian deadlift)
  - Sunday: rest day (walk, weigh in, stretch)
  - Effort in reps in reserve (RIR): heavy lifts stop 1 to 3 reps short of failure, isolation moves 0 to 2 short. Supersets are marked A1 + A2.
  - Every 7th program week a deload (half the sets, same weights) is suggested. You choose yes or no at the start of that week, or turn one on any week from Plan.
  - Older workouts stay in the app for history and are hidden from the pickers.
  - Change any day in Plan > Your week. Before you tick anything, you can also switch a single day's workout from the Today card.
    Days you already logged keep the workout they were logged under, so changing the week never rewrites history.
- Each exercise card shows what it works (main muscles, helper muscles) and a goal tag:
  Strength + muscle, Muscle growth, Core strength, Fat burn, Warm up or Recovery. The Plan tab explains each tag.
- The Today card lists the muscles the day trains.
- If you finished every set last time, the kg box suggests the next small step up (+2.5 kg, or +1 kg under 10 kg).
- Each exercise card: tick box, set buttons (tapping a set starts the rest timer), kg box.
- Bonus exercises are shown every day under the main workout. Do them when your body allows; they do not lower your score if skipped.
- Missed workouts: a training day with nothing real done costs 5 points and gets its own make-up (2 main lifts + 15 min cardio).
  Several missed days in a row each get theirs, queued on the next training days, up to 3 items a day. A skipped make-up day passes its items on.
- Reminder card when you open the app: yesterday missed or half done, morning window (6 to 10 AM) passed with nothing ticked, or items still left for an evening session.
- Each kg box shows what you lifted last time, so you can add weight step by step.
- Watch how to do it link under every exercise, plus a full Watch list in the Plan tab.
- Steps box each day: type the number from your phone's step counter. Hitting 10,000 ticks the steps habit by itself.
- Cardio and daily habits (water, steps, sleep, no junk) as tick boxes. Diet plan is an optional fold-out section.
- Notes for each day.
- How workout days and streaks are counted:
  - A workout day is a training day where at least one real exercise is ticked (or one of its sets).
    Warm up or cardio alone does not count, and you do not have to finish everything.
  - Streak: workout days in a row. Rest days (Sunday) are skipped, they never add to it or break it.
    An unfinished today does not break it; it adds once you train.
  - Best streak: the longest run ever, with its dates. Also shown: workout days this week, this month, and in total.
  - Today's card shows the current streak and this month's workout days.
- Report tab: weekly report for Monday to Sunday with workout score, workout days, sets, streak, best streak, month and total, habits, meals,
  day-by-day status with steps, missed exercises, best weights vs last week, body weight, notes.
  Download it as a PDF or a Word (.doc) file, or copy it as text. On Sunday the app reminds you the report is ready.
  The PDF maker (jsPDF) loads from cdnjs only when you tap Download PDF, so the app stays light.
- Plan tab: the full week, watch list, rules, backup download/restore, lock, erase.
- Can be added to the phone home screen like an app, and works offline once opened.
- Phone notifications (turn on from the Today card or Plan > Notifications):
  - Workout progress after every tick ("Arms day · 4 of 8, up next: V-bar pushdown").
  - Rest timer with +15 s and Skip buttons, and "Rest over" with vibration even when the screen is off.
  - Works on Android Chrome. On iPhone it needs iOS 16.4+ and the app opened from the Home Screen.
  - There is no server, so the app cannot send reminders while it is fully closed.

## Tracking performance, recovery and food

- Reps and kg per set: tick a set, then type the reps (and kg if it differs from your working weight).
  Weight advice uses double progression: when every set reaches the top of the rep range, add the smallest jump.
- Last-set effort on finished lifts: 3+ left, 1 to 2 left, 0 left, with a tip if it is off target.
- Daily check-in: sleep, soreness, energy, joint pain. Poor recovery offers a lighter day (one set less on every exercise).
- Report: sets per muscle (done vs planned vs a 10 to 20 target band), strength trend (estimated max from kg and reps),
  recovery averages, weekly activity minutes against WHO's 150, protein average. All of it is in the PDF, Word and text reports too.
- Protein card: tap typical Indian veg foods to add protein. Target is 1.3 g per kg of your latest weight.
- Plan > Your numbers: height, age and sex give a calorie target (Mifflin-St Jeor x 1.55, about a 500 kcal deficit,
  never more than 25% or below BMR), adjusted by your weigh-in trend.
- `js/track.js` holds this logic.

## Where the data lives

Everything is stored locally on the phone/browser you use. Nothing is sent to any server.
- **Dual-Layer Local Auto-Backup:** The app automatically backs up your workouts every night and after every session into a browser database vault (IndexedDB + Storage).
- **Persistent Storage:** Requests browser persistent storage to protect your data from automatic phone cache cleanups.
- **Auto-Recovery:** If browser cache or active session data is accidentally cleared, the app automatically finds your latest local backup on startup and restores it.
- **File Backups:** Go to **Plan > Download backup** to save a `.json` backup file directly to your phone's storage or transfer your data to a new device.

## Change the PIN

The PIN is stored as a SHA-256 hash in `js/lock.js` (`PIN_HASH`). To change it:

    printf '1234' | sha256sum

Paste the result into `PIN_HASH`, and change the fallback `atob('...')` string to `btoa('1234')`.
This is a simple screen lock to keep the page private on your phone, not bank-level security.

## Change exercises or meals

Edit `js/data.js` (the default week is `SCHEDULE` there). Each exercise is one `ex(...)` line: id, name, machine, sets, reps, rest seconds, tip, video search words, bonus level.
What it works and its goal tag live in `TARGETS` in the same file, keyed by the exercise id.

## Code layout

No build step. Plain ES modules loaded by `index.html`:

- `js/data.js`: exercises, workouts, default week, habits, meals
- `js/store.js`: saving, auto-backup vault, restore
- `js/plan.js`: which workout a day gets, stats, streak
- `js/views.js`: the Today, Report and Plan screens
- `js/report.js`: weekly report and PDF/Word downloads
- `js/notify.js` + `sw.js`: notifications, rest timer in the background, offline cache
- `js/timer.js`, `js/lock.js`: rest bar, PIN screen
- `js/main.js`: taps, typing and start-up

After changing files, bump `CACHE` in `sw.js` so installed phones drop the old offline copy.

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
