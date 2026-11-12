/* Rahul's gym plan: weekly split, matched to the machines in the gym.
   Edit this file to change exercises, sets, meals or the weekly schedule.
   Each exercise is one ex(...) line: id, name, machine, sets, reps, rest seconds, tip, video search words, bonus level.
   Ids must stay unique within a workout. */

const yt = (q) => (q ? 'https://www.youtube.com/results?search_query=' + q : '');

function ex(id, name, machine, sets, reps, rest, tip, q, bonus) {
  return { id, name, machine, sets, reps, rest, tip, video: yt(q), bonus: bonus || 0 };
}

export const WARMUP = ex('warmup', 'Warm up', 'Spin bike or treadmill, easy pace', 1, '5 to 8 min', 0, 'Get warm before the first lift.', '');

const ARMS = {
  key: 'arms',
  focus: 'Biceps + Triceps',
  short: 'Arms',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4 to 5 km/h' },
  exercises: [
    ex('curl-machine', 'Machine biceps curl, both hands', 'Biceps curl machine (plate loaded, red arm)', 3, '10-12', 60, 'Chest on the pad. No swinging.', 'plate+loaded+biceps+curl+machine+form'),
    ex('preacher-db', 'Single arm preacher curl', 'Curl machine arm pad + dumbbell', 3, '10-12 each arm', 60, 'Lower slowly, full stretch at the bottom.', 'single+arm+dumbbell+preacher+curl'),
    ex('bar-curl', 'Barbell curl (10 kg rod going up to 15 kg)', 'EZ or straight bar from the rack', 3, '8-10', 75, 'Elbows still, no leaning back.', 'ez+bar+curl+proper+form'),
    ex('tri-press', 'Triceps press (push handles down)', 'Triceps press / seated dip machine', 3, '10-12', 60, 'Shoulders down, push till arms are straight.', 'plate+loaded+seated+dip+machine+triceps'),
    ex('vbar', 'V-bar pushdown', 'Cable pulley, V-bar', 3, '12', 60, 'Elbows pinned to your sides.', 'v+bar+tricep+pushdown+form'),
    ex('straight-bar', 'Straight bar pushdown', 'Cable pulley, straight bar (pipe)', 3, '10-12', 60, 'Squeeze at the bottom for 1 second.', 'straight+bar+tricep+pushdown+form'),
    ex('hammer', 'Hammer curl', 'Dumbbells', 3, '12', 60, 'Palms facing each other.', 'dumbbell+hammer+curl+form', 1),
    ex('oh-ext', 'Seated overhead dumbbell extension', 'Bench upright + one dumbbell', 3, '12', 60, 'Elbows point up, lower behind the head.', 'seated+overhead+dumbbell+tricep+extension', 2)
  ]
};

const CHEST = {
  key: 'push',
  focus: 'Chest + Shoulders',
  short: 'Chest',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    ex('pec-fly', 'Pec fly, facing out', 'Pec Fly & Rear Delt machine', 3, '12', 60, 'Slight bend in elbows, squeeze in the middle.', 'pec+deck+fly+machine+form'),
    ex('incline-smith', 'Incline press (compulsory)', 'Smith machine + bench at 30 to 45 degrees', 3, '10', 120, 'Bar to upper chest. 30 to 45 degrees hits the upper chest best.', 'smith+machine+incline+bench+press+form'),
    ex('flat-press', 'Flat chest press', 'Plate loaded chest press (flat bench, red arms)', 3, '8-10', 120, 'Handles at mid chest, feet flat.', 'plate+loaded+iso+lateral+bench+press'),
    ex('chest-press', 'Seated chest press', 'Chest press machine (pin stack)', 3, '10-12', 90, 'Smooth and controlled.', 'seated+chest+press+machine+form'),
    ex('db-press', 'Shoulder press', 'Bench upright + dumbbells', 3, '10', 90, 'Do not lock elbows at the top.', 'seated+dumbbell+shoulder+press+form'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle, cable crossing in front', 3, '12 each side', 45, 'Lead with the elbow, stop at shoulder height.', 'single+arm+cable+lateral+raise'),
    ex('db-lateral', 'Dumbbell lateral raise', 'Dumbbells', 3, '15', 45, 'Light weight, slow.', 'dumbbell+lateral+raise+form', 1),
    ex('incline-fly', 'Incline dumbbell fly', 'Bench at 30 degrees + dumbbells', 3, '12', 60, 'Stretch wide, do not go too heavy.', 'incline+dumbbell+fly+form', 2)
  ]
};

const BACK = {
  key: 'back',
  focus: 'Back + light legs',
  short: 'Back',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4 to 5 km/h' },
  exercises: [
    ex('front-lat', 'Front lat pulldown', 'Plate loaded front lat pulldown (knee pads)', 3, '10-12', 90, 'Chest up, pull with elbows.', 'plate+loaded+lat+pulldown+form'),
    ex('close-pull', 'Close grip pulldown', 'Cable lat pulldown, MAG grip / V-handle', 3, '10-12', 90, 'Lean back only a little.', 'mag+grip+close+grip+lat+pulldown'),
    ex('seated-row', 'Seated row, chest on pad', 'Plate loaded seated row', 3, '10-12', 90, 'Squeeze shoulder blades at the end.', 'plate+loaded+seated+row+machine+form'),
    ex('db-row', 'One arm dumbbell row', 'Flat bench + dumbbell', 3, '10 each arm', 60, 'Back flat, pull to the hip.', 'one+arm+dumbbell+row+form'),
    ex('rear-delt', 'Rear delt fly, facing the pad', 'Pec Fly & Rear Delt machine', 3, '15', 60, 'Light weight, arms wide.', 'reverse+pec+deck+fly+form'),
    ex('back-ext', 'Back extension, bodyweight only', '45 degree back extension bench', 3, '12, slow', 60, 'Stop when body is a straight line. No arching.', '45+degree+back+extension+form'),
    ex('leg-press-light', 'Leg press, light', '45 degree leg press', 2, '15', 90, 'Light. Do not lock knees.', '45+degree+leg+press+form'),
    ex('leg-ext-light', 'Leg extension, light', 'Leg extension / leg curl machine', 2, '15', 60, 'Light and controlled.', 'leg+extension+machine+form'),
    ex('plank', 'Plank', 'Floor / mat', 3, '30 sec', 45, 'Straight line from head to heels.', 'plank+proper+form'),
    ex('straight-arm', 'Straight arm pulldown', 'Cable pulley, straight bar', 3, '12', 60, 'Arms nearly straight, pull to thighs.', 'straight+arm+cable+pulldown+form', 1),
    ex('shrug', 'Dumbbell shrug', 'Dumbbells', 3, '12', 60, 'Shoulders straight up, hold 1 second.', 'dumbbell+shrug+form', 2)
  ]
};

const LEGS = {
  key: 'legs',
  focus: 'Legs focus + 1 back',
  short: 'Legs',
  cardio: { name: 'Easy walk', detail: '10 min, flat' },
  exercises: [
    ex('leg-press', 'Leg press', '45 degree leg press', 4, '15/12/10/10', 120, 'Add weight each set. Never lock knees at the top.', '45+degree+leg+press+form'),
    ex('super-squat', 'Super squat', 'Super squat machine (red, shoulder pads)', 3, '10', 120, 'Knees track over toes.', 'super+squat+machine+form'),
    ex('rdl', 'Romanian deadlift', 'Dumbbells', 3, '10', 90, 'Hips back, back flat, slow on the way down.', 'dumbbell+romanian+deadlift+form'),
    ex('leg-ext', 'Leg extension', 'Leg extension / leg curl machine', 3, '12-15', 60, 'Pause 1 second at the top.', 'leg+extension+machine+form'),
    ex('leg-curl', 'Seated leg curl', 'Same machine, curl setting', 3, '12', 60, 'Control the way back up.', 'seated+leg+curl+machine+form'),
    ex('add-abd', 'Adductor (squeeze in), then abductor (push out)', 'Adductor / abductor machine', 4, '15 (2 sets each)', 45, 'Slow, no bouncing.', 'hip+adductor+abductor+machine+form'),
    ex('calf', 'Calf raise, pause at top', '45 degree leg press, balls of feet on the plate edge', 4, '15', 45, 'Full stretch at the bottom.', 'calf+raise+on+leg+press+form'),
    ex('front-lat-sat', 'Front lat pulldown (the one back exercise)', 'Plate loaded front lat pulldown', 3, '10-12', 90, 'Chest up, pull with elbows.', 'plate+loaded+lat+pulldown+form'),
    ex('plank-sat', 'Plank', 'Floor / mat', 3, '30 sec', 45, 'Straight line from head to heels.', 'plank+proper+form'),
    ex('lunges', 'Walking lunges', 'Dumbbells or bodyweight', 2, '10 each leg', 90, 'Back knee close to the floor.', 'dumbbell+walking+lunges+form', 1),
    ex('smith-squat', 'Smith machine squat', 'Smith machine', 3, '10', 120, 'Feet slightly forward of the bar.', 'smith+machine+squat+form', 2)
  ]
};

const REST = {
  key: 'rest',
  focus: 'Rest day',
  short: 'Rest',
  rest: true,
  tasks: [
    { id: 'walk', name: 'Outdoor walk', detail: '30 to 45 min, easy pace' },
    { id: 'weigh', name: 'Weigh in', detail: 'Morning, before eating. Enter it in the Report tab.' },
    { id: 'stretch', name: 'Stretch', detail: '10 min, legs, hips and back' }
  ]
};

/* ---------- Week from 26 Oct 2026: one main muscle per day ---------- */

// Monday: chest focus, a little side shoulder
const CHEST_DAY = {
  key: 'chest',
  focus: 'Chest + a little shoulder',
  short: 'Chest',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    ex('pec-fly', 'Pec fly, facing out', 'Pec Fly & Rear Delt machine', 3, '12', 60, 'Slight bend in elbows, squeeze in the middle. Warms up the chest.', 'pec+deck+fly+machine+form'),
    ex('flat-press', 'Flat chest press', 'Plate loaded chest press (flat bench, red arms)', 4, '8-10', 120, 'Handles at mid chest, feet flat, shoulder blades back.', 'plate+loaded+iso+lateral+bench+press'),
    ex('incline-smith', 'Incline press', 'Smith machine + bench at 30 to 45 degrees', 3, '10', 120, 'Bar to upper chest. Builds the upper chest.', 'smith+machine+incline+bench+press+form'),
    ex('db-flat-press', 'Flat dumbbell press', 'Flat bench + dumbbells', 3, '10', 90, 'Lower slowly to chest level, press up and slightly in.', 'flat+dumbbell+bench+press+form'),
    ex('chest-press', 'Seated chest press', 'Chest press machine (pin stack)', 3, '10-12', 90, 'Smooth and controlled, full squeeze.', 'seated+chest+press+machine+form'),
    ex('cable-fly', 'Cable crossover, high to low', 'Cable crossover, both pulleys high', 3, '12', 60, 'Bring hands together at belly button level.', 'cable+crossover+high+to+low+form'),
    ex('db-lateral', 'Dumbbell lateral raise', 'Dumbbells', 3, '15', 45, 'Light weight, lift to shoulder height, slow down.', 'dumbbell+lateral+raise+form'),
    ex('pushup', 'Incline push-ups, hands on bench', 'Flat bench or Smith bar set at hip height', 2, 'as many as clean', 60, 'Body in a straight line. Finisher for the chest.', 'incline+push+up+form', 1),
    ex('incline-fly', 'Incline dumbbell fly', 'Bench at 30 degrees + dumbbells', 3, '12', 60, 'Stretch wide, do not go too heavy.', 'incline+dumbbell+fly+form', 1)
  ]
};

// Thursday: shoulders focus, a little upper chest
const SHOULDERS = {
  key: 'shoulders',
  focus: 'Shoulders + a little chest',
  short: 'Delts',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    ex('db-press', 'Seated dumbbell shoulder press', 'Bench upright + dumbbells', 4, '10', 90, 'Do not lock elbows at the top. Main lift of the day.', 'seated+dumbbell+shoulder+press+form'),
    ex('arnold', 'Arnold press', 'Bench upright + dumbbells', 3, '10', 90, 'Start palms facing you, rotate out as you press.', 'arnold+press+form'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle, cable crossing in front', 3, '12 each side', 45, 'Lead with the elbow, stop at shoulder height.', 'single+arm+cable+lateral+raise'),
    ex('front-raise', 'Dumbbell front raise', 'Dumbbells', 3, '12', 60, 'Lift to eye level, no swinging.', 'dumbbell+front+raise+form'),
    ex('rear-delt', 'Rear delt fly, facing the pad', 'Pec Fly & Rear Delt machine', 3, '15', 60, 'Light weight, arms wide.', 'reverse+pec+deck+fly+form'),
    ex('face-pull', 'Cable face pull', 'Cable pulley at face height, rope', 3, '15', 60, 'Pull the rope to your forehead, elbows high. Good for shoulder health.', 'cable+face+pull+form'),
    ex('incline-smith', 'Incline press (the little chest)', 'Smith machine + bench at 30 to 45 degrees', 3, '10', 120, 'Bar to upper chest.', 'smith+machine+incline+bench+press+form'),
    ex('shrug', 'Dumbbell shrug', 'Dumbbells', 3, '12', 60, 'Shoulders straight up, hold 1 second.', 'dumbbell+shrug+form'),
    ex('db-lateral', 'Dumbbell lateral raise, drop set', 'Dumbbells', 2, '15 then lighter to failure', 60, 'Go lighter as soon as form breaks.', 'dumbbell+lateral+raise+drop+set', 1),
    ex('pec-fly', 'Pec fly, facing out', 'Pec Fly & Rear Delt machine', 2, '15', 60, 'Light, just a pump for the chest.', 'pec+deck+fly+machine+form', 1)
  ]
};

// Friday: second arm day with different moves, plus a shoulder finisher and abs
const ARMS_PLUS = {
  key: 'armsplus',
  focus: 'Arms + shoulder finisher',
  short: 'Arms+',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4 to 5 km/h' },
  exercises: [
    ex('cable-curl', 'Cable curl, straight bar', 'Cable low pulley, straight bar', 3, '12', 60, 'Elbows by your sides, squeeze at the top.', 'cable+bicep+curl+straight+bar+form'),
    ex('incline-curl', 'Incline dumbbell curl', 'Bench at 45 degrees + dumbbells', 3, '10', 60, 'Arms hang straight down, big stretch.', 'incline+dumbbell+curl+form'),
    ex('hammer', 'Hammer curl', 'Dumbbells', 3, '12', 60, 'Palms facing each other.', 'dumbbell+hammer+curl+form'),
    ex('rope-pushdown', 'Rope pushdown', 'Cable pulley, rope', 3, '12', 60, 'Split the rope apart at the bottom.', 'rope+tricep+pushdown+form'),
    ex('oh-ext', 'Seated overhead dumbbell extension', 'Bench upright + one dumbbell', 3, '12', 60, 'Elbows point up, lower behind the head.', 'seated+overhead+dumbbell+tricep+extension'),
    ex('reverse-pushdown', 'Single arm reverse grip pushdown', 'Cable pulley, D-handle', 3, '12 each arm', 45, 'Palm facing up, elbow pinned.', 'single+arm+reverse+grip+tricep+pushdown'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle', 3, '12 each side', 45, 'Lead with the elbow, stop at shoulder height.', 'single+arm+cable+lateral+raise'),
    ex('rear-delt', 'Rear delt fly, facing the pad', 'Pec Fly & Rear Delt machine', 3, '15', 60, 'Light weight, arms wide.', 'reverse+pec+deck+fly+form'),
    ex('plank-fri', 'Plank', 'Floor / mat', 3, '30 sec', 45, 'Straight line from head to heels.', 'plank+proper+form'),
    ex('curl-machine', 'Machine biceps curl, light pump', 'Biceps curl machine (plate loaded, red arm)', 2, '15', 60, 'Light weight, slow reps to finish the biceps.', 'plate+loaded+biceps+curl+machine+form', 1),
    ex('tri-press', 'Triceps press, light pump', 'Triceps press / seated dip machine', 2, '15', 60, 'Light weight, slow reps to finish the triceps.', 'plate+loaded+seated+dip+machine+triceps', 1)
  ]
};

// Saturday: legs only (the old Saturday also had one back exercise)
const LEG_DAY = {
  key: 'legday',
  focus: 'Legs',
  short: 'Legs',
  cardio: { name: 'Easy walk', detail: '10 min, flat' },
  exercises: [
    ex('leg-press', 'Leg press', '45 degree leg press', 4, '15/12/10/10', 120, 'Add weight each set. Never lock knees at the top.', '45+degree+leg+press+form'),
    ex('super-squat', 'Super squat', 'Super squat machine (red, shoulder pads)', 3, '10', 120, 'Knees track over toes.', 'super+squat+machine+form'),
    ex('rdl', 'Romanian deadlift', 'Dumbbells', 3, '10', 90, 'Hips back, back flat, slow on the way down.', 'dumbbell+romanian+deadlift+form'),
    ex('leg-ext', 'Leg extension', 'Leg extension / leg curl machine', 3, '12-15', 60, 'Pause 1 second at the top.', 'leg+extension+machine+form'),
    ex('leg-curl', 'Seated leg curl', 'Same machine, curl setting', 3, '12', 60, 'Control the way back up.', 'seated+leg+curl+machine+form'),
    ex('add-abd', 'Adductor (squeeze in), then abductor (push out)', 'Adductor / abductor machine', 4, '15 (2 sets each)', 45, 'Slow, no bouncing.', 'hip+adductor+abductor+machine+form'),
    ex('goblet-squat', 'Goblet squat', 'One dumbbell held at the chest', 3, '10', 90, 'Sit down between your heels, chest up.', 'goblet+squat+form'),
    ex('calf', 'Calf raise, pause at top', '45 degree leg press, balls of feet on the plate edge', 4, '15', 45, 'Full stretch at the bottom.', 'calf+raise+on+leg+press+form'),
    ex('plank-sat', 'Plank', 'Floor / mat', 3, '30 sec', 45, 'Straight line from head to heels.', 'plank+proper+form'),
    ex('lunges', 'Walking lunges', 'Dumbbells or bodyweight', 2, '10 each leg', 90, 'Back knee close to the floor.', 'dumbbell+walking+lunges+form', 1),
    ex('smith-squat', 'Smith machine squat', 'Smith machine', 3, '10', 120, 'Feet slightly forward of the bar.', 'smith+machine+squat+form', 1)
  ]
};

/* ---------- Balanced week from 1 Nov 2026 (intermediate) ----------
   Every muscle is trained twice a week (research: 2x beats 1x for growth),
   about 10 to 20 hard sets per muscle per week, Sunday rest.
   Effort in reps in reserve (RIR), per the 2026 ACSM position stand: heavy lifts stop 1 to 3 reps short of failure,
   isolation moves 0 to 2 reps short. Every 7th program week is a deload (half the sets).
   Supersets (same tag, e.g. A1 + A2): do one set of each back to back, then rest. Saves time, keeps the heart rate up. */

// Monday: chest (heavy) + triceps + side delts + abs
const PUSH_A = {
  key: 'pushA',
  focus: 'Chest + Triceps',
  short: 'Chest',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    ex('flat-press', 'Flat chest press, heavy', 'Plate loaded chest press (flat bench, red arms)', 4, '6-8', 150, 'Main lift, stop 1 to 3 reps short of failure. Add weight when you hit 8 on all sets. Shoulder blades back.', 'plate+loaded+iso+lateral+bench+press'),
    ex('incline-smith', 'Incline press', 'Smith machine + bench at 30 degrees', 3, '8-10', 120, 'Bar to upper chest, 30 degrees hits the upper chest best.', 'smith+machine+incline+bench+press+form'),
    ex('cable-fly', 'Cable crossover, high to low', 'Cable crossover, both pulleys high', 3, '12-15', 60, 'Big stretch, hands meet at belly button level.', 'cable+crossover+high+to+low+form'),
    ex('db-lateral', 'Dumbbell lateral raise', 'Dumbbells', 3, '12-15', 45, 'Pinkies slightly up, stop at shoulder height. Last set close to failure.', 'dumbbell+lateral+raise+form'),
    ex('tri-press', 'Triceps press, heavy (A1)', 'Triceps press / seated dip machine', 3, '8-10', 0, 'Superset A: go straight to the overhead extension.', 'plate+loaded+seated+dip+machine+triceps'),
    ex('oh-ext', 'Seated overhead dumbbell extension (A2)', 'Bench upright + one dumbbell', 3, '10-12', 75, 'Deep stretch behind the head grows the long head most. Rest after this one.', 'seated+overhead+dumbbell+tricep+extension'),
    ex('cable-crunch', 'Kneeling cable crunch', 'Cable pulley high, rope', 3, '12-15', 45, 'Round the spine, elbows to knees. Hips stay still.', 'kneeling+cable+crunch+form'),
    ex('chest-press', 'Seated chest press, pump', 'Chest press machine (pin stack)', 2, '15', 60, 'Light finisher.', 'seated+chest+press+machine+form', 1),
    ex('straight-bar', 'Straight bar pushdown', 'Cable pulley, straight bar', 2, '15', 45, 'Squeeze 1 second at the bottom.', 'straight+bar+tricep+pushdown+form', 2)
  ]
};

// Tuesday: back width + biceps + rear delts
const PULL_A = {
  key: 'pullA',
  focus: 'Back + Biceps',
  short: 'Back',
  cardio: { name: 'Spin bike intervals', detail: '15 min: 8 rounds of 30 sec hard + 60 sec easy, then easy spin' },
  exercises: [
    ex('front-lat', 'Front lat pulldown, heavy', 'Plate loaded front lat pulldown (knee pads)', 4, '8-10', 120, 'Main lift, stop 1 to 3 reps short of failure. Chest up, pull elbows down to your ribs.', 'plate+loaded+lat+pulldown+form'),
    ex('db-row', 'One arm dumbbell row', 'Flat bench + dumbbell', 3, '8-10 each arm', 90, 'Pull to the hip, big stretch at the bottom.', 'one+arm+dumbbell+row+form'),
    ex('close-pull', 'Close grip pulldown', 'Cable lat pulldown, MAG grip / V-handle', 3, '10-12', 90, 'Lean back a little, squeeze the lats.', 'mag+grip+close+grip+lat+pulldown'),
    ex('rear-delt', 'Rear delt fly, facing the pad', 'Pec Fly & Rear Delt machine', 3, '15', 45, 'Light, arms wide, pause at the back.', 'reverse+pec+deck+fly+form'),
    ex('bar-curl', 'Barbell curl', 'EZ or straight bar from the rack', 3, '8-10', 75, 'Elbows still, no leaning back.', 'ez+bar+curl+proper+form'),
    ex('incline-curl', 'Incline dumbbell curl', 'Bench at 45 degrees + dumbbells', 3, '10-12', 60, 'Arms hang straight down, the stretch grows the biceps.', 'incline+dumbbell+curl+form'),
    ex('straight-arm', 'Straight arm pulldown', 'Cable pulley, straight bar', 2, '12-15', 60, 'Arms nearly straight, pull to thighs.', 'straight+arm+cable+pulldown+form', 1),
    ex('hammer', 'Hammer curl', 'Dumbbells', 2, '12', 60, 'Palms facing each other.', 'dumbbell+hammer+curl+form', 2)
  ]
};

// Wednesday: legs, quad focus + calves + abs
const LEGS_A = {
  key: 'legsA',
  focus: 'Legs (quads) + Abs',
  short: 'Legs',
  cardio: { name: 'Easy bike', detail: '10 min, light, to flush the legs' },
  exercises: [
    ex('super-squat', 'Super squat, heavy', 'Super squat machine (red, shoulder pads)', 4, '8-10', 150, 'Main lift, stop 1 to 3 reps short of failure. Deep as you can with a flat back, knees over toes.', 'super+squat+machine+form'),
    ex('leg-press', 'Leg press', '45 degree leg press, feet middle of the plate', 4, '10-12', 120, 'Go deep, never lock the knees.', '45+degree+leg+press+form'),
    ex('lunges', 'Walking lunges', 'Dumbbells (or bodyweight to start)', 3, '10 each leg', 90, 'Long steps, back knee close to the floor.', 'dumbbell+walking+lunges+form'),
    ex('leg-ext', 'Leg extension', 'Leg extension / leg curl machine', 3, '12-15', 60, 'Pause 1 second at the top, last set close to failure.', 'leg+extension+machine+form'),
    ex('leg-curl', 'Seated leg curl', 'Same machine, curl setting', 3, '10-12', 60, 'Lean forward a little for more stretch. Control the way up.', 'seated+leg+curl+machine+form'),
    ex('calf', 'Calf raise, pause at top', '45 degree leg press, balls of feet on the plate edge', 4, '12-15', 45, 'Full stretch at the bottom, 1 second hold at the top.', 'calf+raise+on+leg+press+form'),
    ex('leg-raise', 'Lying leg raise', 'Flat bench or mat', 3, '12-15', 45, 'Lower back pressed down, lower slowly.', 'lying+leg+raise+form'),
    ex('add-abd', 'Adductor, then abductor', 'Adductor / abductor machine', 2, '15 each', 45, 'Slow, no bouncing.', 'hip+adductor+abductor+machine+form', 1)
  ]
};

// Thursday: shoulders + back (thickness and rear delts)
const SHOULDER_BACK = {
  key: 'shoback',
  focus: 'Shoulders + Back',
  short: 'Delts+Back',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    ex('db-press', 'Seated dumbbell shoulder press, heavy', 'Bench upright + dumbbells', 4, '8-10', 120, 'Main lift, stop 1 to 3 reps short of failure. Ranked top for front delts in EMG tests. Do not lock elbows.', 'seated+dumbbell+shoulder+press+form'),
    ex('seated-row', 'Seated row, chest on pad, heavy', 'Plate loaded seated row', 4, '8-10', 120, 'Squeeze shoulder blades together, 1 second hold.', 'plate+loaded+seated+row+machine+form'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle, cable crossing in front', 3, '12-15 each side', 45, 'Constant tension. Lead with the elbow, stop at shoulder height.', 'single+arm+cable+lateral+raise'),
    ex('wide-pull', 'Wide grip lat pulldown', 'Cable lat pulldown, long bar', 3, '10-12', 90, 'Hands just outside shoulders, pull to upper chest.', 'wide+grip+lat+pulldown+form'),
    ex('incline-row', 'Chest supported incline dumbbell row', 'Bench at 45 degrees + dumbbells, chest on the pad', 3, '10-12', 75, 'Elbows out wide. Hits rear delts, side delts and upper back together.', 'chest+supported+incline+dumbbell+row+form'),
    ex('rear-delt', 'Rear delt fly, facing the pad (B1)', 'Pec Fly & Rear Delt machine', 3, '15', 0, 'Superset B: go straight to face pulls.', 'reverse+pec+deck+fly+form'),
    ex('face-pull', 'Cable face pull (B2)', 'Cable pulley at face height, rope', 3, '15', 60, 'Pull to forehead, elbows high. Keeps shoulders healthy.', 'cable+face+pull+form'),
    ex('shrug', 'Dumbbell shrug', 'Dumbbells', 2, '12-15', 60, 'Straight up, hold 1 second at the top. Direct work for the traps.', 'dumbbell+shrug+form'),
    ex('db-lateral', 'Dumbbell lateral raise, drop set', 'Dumbbells', 1, '15 then lighter to failure', 0, 'One all-out set to finish the side delts.', 'dumbbell+lateral+raise+drop+set', 1)
  ]
};

// Friday: upper chest + arms (supersets) + core
const PUSH_B = {
  key: 'chestarms',
  focus: 'Chest + Arms',
  short: 'Chest+Arms',
  cardio: { name: 'Spin bike intervals', detail: '15 min: 8 rounds of 30 sec hard + 60 sec easy, then easy spin' },
  exercises: [
    ex('incline-db', 'Incline dumbbell press', 'Bench at 30 degrees + dumbbells', 4, '8-10', 120, 'Main lift, stop 1 to 3 reps short of failure. Upper chest. Lower to chest level, press up and in.', 'incline+dumbbell+press+form'),
    ex('chest-press', 'Seated chest press', 'Chest press machine (pin stack)', 3, '10-12', 90, 'Smooth, full squeeze.', 'seated+chest+press+machine+form'),
    ex('pec-fly', 'Pec fly, facing out', 'Pec Fly & Rear Delt machine', 3, '12-15', 60, 'Slight bend in elbows, squeeze in the middle.', 'pec+deck+fly+machine+form'),
    ex('preacher-db', 'Single arm preacher curl (C1)', 'Curl machine arm pad + dumbbell', 3, '10-12 each arm', 0, 'Superset C: go straight to the rope pushdown.', 'single+arm+dumbbell+preacher+curl'),
    ex('rope-pushdown', 'Rope pushdown (C2)', 'Cable pulley, rope', 3, '12', 60, 'Split the rope at the bottom. Rest after this one.', 'rope+tricep+pushdown+form'),
    ex('hammer', 'Hammer curl (D1)', 'Dumbbells', 3, '10-12', 0, 'Superset D: go straight to the V-bar pushdown.', 'dumbbell+hammer+curl+form'),
    ex('vbar', 'V-bar pushdown (D2)', 'Cable pulley, V-bar', 3, '12', 60, 'Elbows pinned to your sides.', 'v+bar+tricep+pushdown+form'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle', 3, '12-15 each side', 45, 'Second side-delt day of the week. Last set 0 to 2 reps short of failure.', 'single+arm+cable+lateral+raise'),
    ex('plank', 'Plank', 'Floor / mat', 3, '40 sec', 45, 'Straight line, squeeze glutes and abs.', 'plank+proper+form'),
    ex('curl-machine', 'Machine biceps curl, pump', 'Biceps curl machine (plate loaded, red arm)', 2, '15', 45, 'Light, slow reps.', 'plate+loaded+biceps+curl+machine+form', 2)
  ]
};

// Saturday: legs, glutes + hamstrings (no Romanian deadlift) + core
const LEGS_B = {
  key: 'legsB',
  focus: 'Legs (glutes + hamstrings)',
  short: 'Glutes',
  cardio: { name: 'Incline treadmill walk', detail: '15 min, incline 6 to 10, steady' },
  exercises: [
    ex('hip-thrust', 'Smith machine hip thrust', 'Smith machine + flat bench, pad on the bar', 4, '8-10', 120, 'Replaces the Romanian deadlift. Upper back on the bench, chin tucked, squeeze glutes 1 second at the top. Easy on the lower back.', 'smith+machine+hip+thrust+form'),
    ex('leg-curl', 'Seated leg curl, heavy', 'Leg extension / leg curl machine, curl setting', 4, '8-12', 75, 'Seated curls grow the hamstrings more than lying ones. Lean forward, slow on the way up.', 'seated+leg+curl+machine+form'),
    ex('back-ext-glute', '45 degree back extension, glute focus', '45 degree back extension bench, hold a plate', 3, '10-12', 75, 'Round the upper back slightly, push hips into the pad with the glutes. Stop at a straight line.', '45+degree+back+extension+glute+focus'),
    ex('leg-press-high', 'Leg press, feet high and wide', '45 degree leg press, feet at the top of the plate', 3, '10-12', 120, 'High feet shift the work to glutes and hamstrings. Do not lock knees.', 'leg+press+feet+high+wide+glutes'),
    ex('split-squat', 'Bulgarian split squat', 'Flat bench + dumbbells (hold the Smith bar for balance if needed)', 3, '8-10 each leg', 90, 'Front foot far forward, lean the chest a little for more glutes.', 'dumbbell+bulgarian+split+squat+glutes'),
    ex('add-abd', 'Abductor (push out), then adductor', 'Adductor / abductor machine', 3, '15 each', 45, 'Lean forward on the abductor for the upper glutes.', 'hip+adductor+abductor+machine+form'),
    ex('calf', 'Calf raise, pause at top', '45 degree leg press, balls of feet on the plate edge', 4, '12-15', 45, 'Full stretch at the bottom.', 'calf+raise+on+leg+press+form'),
    ex('plank', 'Plank', 'Floor / mat', 3, '40 sec', 45, 'Straight line from head to heels.', 'plank+proper+form', 1),
    ex('leg-ext', 'Leg extension, pump', 'Leg extension / leg curl machine', 2, '15', 45, 'Light finisher for the quads.', 'leg+extension+machine+form', 2)
  ]
};

/* ---------- Simple week from 5 Nov 2026: one muscle per day ----------
   Mon chest, Tue back, Wed shoulders, Thu biceps, Fri triceps, Sat legs, Sun rest.
   Each muscle gets one full session a week with enough sets to grow (about 16 to 22 hard sets),
   the way the original split worked. Main lifts stop 1 to 3 reps short of failure. */

const CHEST_ONLY = {
  key: 'chestOnly',
  focus: 'Chest',
  short: 'Chest',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    ex('flat-press', 'Flat chest press, heavy', 'Plate loaded chest press (flat bench, red arms)', 4, '6-10', 150, 'Main lift. Shoulder blades back, handles at mid chest. Add weight when you hit 10 on all sets.', 'plate+loaded+iso+lateral+bench+press'),
    ex('incline-smith', 'Incline press', 'Smith machine + bench at 30 degrees', 3, '8-10', 120, 'Bar to upper chest. 30 degrees hits the upper chest best.', 'smith+machine+incline+bench+press+form'),
    ex('db-flat-press', 'Flat dumbbell press', 'Flat bench + dumbbells', 3, '10', 90, 'Lower slowly to chest level, press up and slightly in.', 'flat+dumbbell+bench+press+form'),
    ex('chest-press', 'Seated chest press', 'Chest press machine (pin stack)', 3, '10-12', 90, 'Smooth and controlled, full squeeze.', 'seated+chest+press+machine+form'),
    ex('cable-fly', 'Cable crossover, high to low', 'Cable crossover, both pulleys high', 3, '12-15', 60, 'Big stretch, hands meet at belly button level.', 'cable+crossover+high+to+low+form'),
    ex('pec-fly', 'Pec fly, facing out', 'Pec Fly & Rear Delt machine', 3, '12-15', 60, 'Slight bend in elbows, squeeze in the middle for 1 second.', 'pec+deck+fly+machine+form'),
    ex('incline-fly', 'Incline dumbbell fly', 'Bench at 30 degrees + dumbbells', 2, '12', 60, 'Stretch wide, do not go too heavy.', 'incline+dumbbell+fly+form', 1),
    ex('pushup', 'Incline push-ups, hands on bench', 'Flat bench or Smith bar at hip height', 2, 'as many as clean', 60, 'Body in a straight line. Finisher.', 'incline+push+up+form', 2)
  ]
};

const BACK_ONLY = {
  key: 'backOnly',
  focus: 'Back',
  short: 'Back',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    ex('front-lat', 'Front lat pulldown, heavy', 'Plate loaded front lat pulldown (knee pads)', 4, '8-10', 120, 'Main lift. Chest up, pull elbows down to your ribs.', 'plate+loaded+lat+pulldown+form'),
    ex('seated-row', 'Seated row, chest on pad', 'Plate loaded seated row', 4, '8-10', 120, 'Squeeze shoulder blades together, 1 second hold.', 'plate+loaded+seated+row+machine+form'),
    ex('db-row', 'One arm dumbbell row', 'Flat bench + dumbbell', 3, '8-10 each arm', 90, 'Back flat, pull to the hip, big stretch at the bottom.', 'one+arm+dumbbell+row+form'),
    ex('wide-pull', 'Wide grip lat pulldown', 'Cable lat pulldown, long bar', 3, '10-12', 90, 'Hands just outside shoulders, pull to upper chest.', 'wide+grip+lat+pulldown+form'),
    ex('close-pull', 'Close grip pulldown', 'Cable lat pulldown, MAG grip / V-handle', 3, '10-12', 90, 'Lean back only a little, squeeze the lats.', 'mag+grip+close+grip+lat+pulldown'),
    ex('straight-arm', 'Straight arm pulldown', 'Cable pulley, straight bar', 3, '12-15', 60, 'Arms nearly straight, pull to thighs.', 'straight+arm+cable+pulldown+form'),
    ex('back-ext', 'Back extension, bodyweight', '45 degree back extension bench', 3, '12, slow', 60, 'Stop when your body is a straight line. No arching. Protects the lower back.', '45+degree+back+extension+form'),
    ex('incline-row', 'Chest supported incline dumbbell row', 'Bench at 45 degrees + dumbbells, chest on the pad', 2, '10-12', 75, 'Elbows out wide for the upper back.', 'chest+supported+incline+dumbbell+row+form', 1)
  ]
};

const SHOULDERS_ONLY = {
  key: 'shouldersOnly',
  focus: 'Shoulders',
  short: 'Delts',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    ex('db-press', 'Seated dumbbell shoulder press, heavy', 'Bench upright + dumbbells', 4, '8-10', 120, 'Main lift. Do not lock elbows at the top.', 'seated+dumbbell+shoulder+press+form'),
    ex('arnold', 'Arnold press', 'Bench upright + dumbbells', 3, '10', 90, 'Start palms facing you, rotate out as you press.', 'arnold+press+form'),
    ex('db-lateral', 'Dumbbell lateral raise', 'Dumbbells', 4, '12-15', 45, 'Pinkies slightly up, stop at shoulder height. Last set close to failure.', 'dumbbell+lateral+raise+form'),
    ex('cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle, cable crossing in front', 3, '12-15 each side', 45, 'Lead with the elbow, stop at shoulder height.', 'single+arm+cable+lateral+raise'),
    ex('front-raise', 'Dumbbell front raise', 'Dumbbells', 3, '12', 60, 'Lift to eye level, no swinging.', 'dumbbell+front+raise+form'),
    ex('rear-delt', 'Rear delt fly, facing the pad', 'Pec Fly & Rear Delt machine', 3, '15', 45, 'Light, arms wide, pause at the back.', 'reverse+pec+deck+fly+form'),
    ex('face-pull', 'Cable face pull', 'Cable pulley at face height, rope', 3, '15', 60, 'Pull to forehead, elbows high. Keeps shoulders healthy.', 'cable+face+pull+form'),
    ex('shrug', 'Dumbbell shrug', 'Dumbbells', 3, '12-15', 60, 'Straight up, hold 1 second at the top.', 'dumbbell+shrug+form', 1)
  ]
};

const BICEPS_ONLY = {
  key: 'bicepsOnly',
  focus: 'Biceps',
  short: 'Biceps',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    ex('bar-curl', 'Barbell curl, heavy', 'EZ or straight bar from the rack', 4, '8-10', 90, 'Main lift. Elbows still, no leaning back.', 'ez+bar+curl+proper+form'),
    ex('preacher-db', 'Single arm preacher curl', 'Curl machine arm pad + dumbbell', 3, '10-12 each arm', 60, 'Lower slowly, full stretch at the bottom.', 'single+arm+dumbbell+preacher+curl'),
    ex('incline-curl', 'Incline dumbbell curl', 'Bench at 45 degrees + dumbbells', 3, '10-12', 60, 'Arms hang straight down, the stretch grows the biceps.', 'incline+dumbbell+curl+form'),
    ex('cable-curl', 'Cable curl, straight bar', 'Cable low pulley, straight bar', 3, '12', 60, 'Elbows by your sides, squeeze at the top.', 'cable+bicep+curl+straight+bar+form'),
    ex('hammer', 'Hammer curl', 'Dumbbells', 3, '10-12', 60, 'Palms facing each other. Builds arm thickness and forearms.', 'dumbbell+hammer+curl+form'),
    ex('curl-machine', 'Machine biceps curl', 'Biceps curl machine (plate loaded, red arm)', 3, '12-15', 60, 'Slow reps, squeeze at the top. Last set close to failure.', 'plate+loaded+biceps+curl+machine+form'),
    ex('plank', 'Plank', 'Floor / mat', 3, '40 sec', 45, 'Straight line from head to heels.', 'plank+proper+form', 1)
  ]
};

const TRICEPS_ONLY = {
  key: 'tricepsOnly',
  focus: 'Triceps',
  short: 'Tris',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    ex('tri-press', 'Triceps press, heavy', 'Triceps press / seated dip machine', 4, '8-10', 90, 'Main lift. Shoulders down, push till arms are straight.', 'plate+loaded+seated+dip+machine+triceps'),
    ex('oh-ext', 'Seated overhead dumbbell extension', 'Bench upright + one dumbbell', 3, '10-12', 75, 'Deep stretch behind the head grows the long head most.', 'seated+overhead+dumbbell+tricep+extension'),
    ex('rope-pushdown', 'Rope pushdown', 'Cable pulley, rope', 3, '12', 60, 'Split the rope apart at the bottom.', 'rope+tricep+pushdown+form'),
    ex('vbar', 'V-bar pushdown', 'Cable pulley, V-bar', 3, '12', 60, 'Elbows pinned to your sides.', 'v+bar+tricep+pushdown+form'),
    ex('straight-bar', 'Straight bar pushdown', 'Cable pulley, straight bar', 3, '12-15', 60, 'Squeeze 1 second at the bottom.', 'straight+bar+tricep+pushdown+form'),
    ex('reverse-pushdown', 'Single arm reverse grip pushdown', 'Cable pulley, D-handle', 3, '12 each arm', 45, 'Palm facing up, elbow pinned. Last set close to failure.', 'single+arm+reverse+grip+tricep+pushdown'),
    ex('cable-crunch', 'Kneeling cable crunch', 'Cable pulley high, rope', 3, '12-15', 45, 'Round the spine, elbows to knees.', 'kneeling+cable+crunch+form', 1)
  ]
};

const LEGS_ONLY = {
  key: 'legsOnly',
  focus: 'Legs',
  short: 'Legs',
  cardio: { name: 'Easy walk', detail: '10 min, flat' },
  exercises: [
    ex('super-squat', 'Super squat, heavy', 'Super squat machine (red, shoulder pads)', 4, '8-10', 150, 'Main lift. Deep as you can with a flat back, knees over toes.', 'super+squat+machine+form'),
    ex('leg-press', 'Leg press', '45 degree leg press, feet middle of the plate', 4, '10-12', 120, 'Go deep, never lock the knees.', '45+degree+leg+press+form'),
    ex('hip-thrust', 'Smith machine hip thrust', 'Smith machine + flat bench, pad on the bar', 3, '8-10', 120, 'Upper back on the bench, chin tucked, squeeze glutes 1 second at the top.', 'smith+machine+hip+thrust+form'),
    ex('leg-ext', 'Leg extension', 'Leg extension / leg curl machine', 3, '12-15', 60, 'Pause 1 second at the top.', 'leg+extension+machine+form'),
    ex('leg-curl', 'Seated leg curl', 'Same machine, curl setting', 3, '10-12', 60, 'Lean forward a little, control the way up.', 'seated+leg+curl+machine+form'),
    ex('lunges', 'Walking lunges', 'Dumbbells (or bodyweight to start)', 3, '10 each leg', 90, 'Long steps, back knee close to the floor.', 'dumbbell+walking+lunges+form'),
    ex('calf', 'Calf raise, pause at top', '45 degree leg press, balls of feet on the plate edge', 4, '12-15', 45, 'Full stretch at the bottom, 1 second hold at the top.', 'calf+raise+on+leg+press+form'),
    ex('add-abd', 'Adductor, then abductor', 'Adductor / abductor machine', 2, '15 each', 45, 'Slow, no bouncing.', 'hip+adductor+abductor+machine+form', 1)
  ]
};

/* ---------- Exercise library from 12 Nov 2026: pick your own ----------
   Mon chest, Tue biceps, Wed triceps, Thu shoulders, Fri back, Sat legs, Sun rest.
   Each day lists every good exercise for that muscle, grouped by area and ordered by priority
   (main lifts first, then isolation, then alternatives). Tick any you do; the day is complete when
   you reach your goal for the day (6, 7 or 8). Warm up and cardio do not count toward it.
   Machines are the ones at the gym (Fitline): plate loaded flat chest press, pin stack chest press,
   pec fly / rear delt, Smith rack with pull-up bar, adjustable bench, cable crossover and pulleys,
   plate loaded front lat pulldown, plate loaded chest-supported row, biceps curl machine with preacher pad,
   seated dip / triceps press, super squat, 45 degree leg press, leg extension / seated leg curl,
   adductor / abductor, 45 degree back extension, dumbbells 2.5 kg and up, fixed straight and EZ barbells. */

// L(group, id, name, machine, sets, reps, rest seconds, goal, main muscles, helper muscles, tip)
function L(group, id, name, machine, sets, reps, rest, goal, main, also, tip) {
  const q = (name.replace(/\(.*?\)/g, '') + ' proper form').trim().toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, '+');
  return { id, name, machine, sets, reps, rest, tip, video: yt(q), google: 'https://www.google.com/search?q=how+to+do+' + q, bonus: 0, group, goal, main, also };
}

const CHEST_LIB = {
  key: 'chestPick', pick: true, focus: 'Chest', short: 'Chest',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    L('Middle chest', 'flat-press', 'Flat chest press, plate loaded', 'Plate loaded chest press (flat bench, red arms)', 4, '8-10', 120, 'strength', ['Chest'], ['Front shoulders', 'Triceps'], 'Shoulder blades back and down, handles at mid chest. Main lift of the day.'),
    L('Middle chest', 'bb-bench', 'Barbell bench press', 'Barbell + flat bench in the Smith rack (set the safety pins)', 4, '6-8', 150, 'strength', ['Chest'], ['Front shoulders', 'Triceps'], 'Bar to lower chest, feet flat, slight arch. Use a spotter or safety pins when heavy.'),
    L('Upper chest', 'incline-smith', 'Incline Smith machine press', 'Smith machine + adjustable bench at 30 degrees', 4, '8-10', 120, 'strength', ['Upper chest'], ['Front shoulders', 'Triceps'], 'Bar to upper chest. 30 degrees hits the upper chest best.'),
    L('Upper chest', 'incline-db', 'Incline dumbbell press', 'Adjustable bench at 30 degrees + dumbbells', 3, '8-10', 120, 'strength', ['Upper chest'], ['Front shoulders', 'Triceps'], 'Lower to chest level, press up and slightly in.'),
    L('Middle chest', 'db-flat-press', 'Flat dumbbell press', 'Adjustable bench flat + dumbbells', 3, '8-10', 90, 'strength', ['Chest'], ['Front shoulders', 'Triceps'], 'Deep stretch at the bottom, do not clank the dumbbells at the top.'),
    L('Middle chest', 'chest-press', 'Seated chest press machine', 'Chest press machine (pin stack)', 3, '10-12', 90, 'strength', ['Chest'], ['Front shoulders', 'Triceps'], 'Seat so handles are at mid chest. Smooth, full squeeze.'),
    L('Upper chest', 'incline-bb', 'Incline barbell bench press', 'Barbell + adjustable bench at 30 degrees in the rack', 3, '6-8', 150, 'strength', ['Upper chest'], ['Front shoulders', 'Triceps'], 'Grip a little wider than shoulders, bar to upper chest.'),
    L('Middle chest', 'smith-flat', 'Smith machine flat bench press', 'Smith machine + adjustable bench flat', 3, '8-10', 120, 'strength', ['Chest'], ['Front shoulders', 'Triceps'], 'Bench placed so the bar lands on the lower chest.'),
    L('Middle chest', 'pec-fly', 'Pec fly machine', 'Pec Fly & Rear Delt machine (facing out)', 3, '12-15', 60, 'muscle', ['Chest'], ['Front shoulders'], 'Slight bend in elbows, squeeze 1 second in the middle.'),
    L('Middle chest', 'cable-cross-mid', 'Cable crossover, chest height', 'Cable crossover, pulleys at shoulder height', 3, '12-15', 60, 'muscle', ['Chest'], ['Front shoulders'], 'Step forward, hug a big tree, hands meet in front of the chest.'),
    L('Lower chest', 'cable-fly', 'High-to-low cable fly', 'Cable crossover, both pulleys high', 3, '12-15', 60, 'muscle', ['Lower chest'], ['Front shoulders'], 'Bring hands together at belly button level.'),
    L('Upper chest', 'low-high-fly', 'Low-to-high cable fly', 'Cable crossover, both pulleys low', 3, '12-15', 60, 'muscle', ['Upper chest'], ['Front shoulders'], 'Scoop up to chin height, palms up.'),
    L('Upper chest', 'incline-fly', 'Incline dumbbell fly', 'Adjustable bench at 30 degrees + dumbbells', 3, '12', 60, 'muscle', ['Upper chest'], ['Front shoulders'], 'Stretch wide, do not go too heavy.'),
    L('Middle chest', 'db-fly', 'Flat dumbbell fly', 'Adjustable bench flat + dumbbells', 3, '12', 60, 'muscle', ['Chest'], ['Front shoulders'], 'Arms slightly bent, lower until you feel a stretch.'),
    L('Lower chest', 'decline-bb', 'Decline barbell press', 'Barbell + adjustable bench on decline in the rack', 3, '8-10', 120, 'strength', ['Lower chest'], ['Triceps'], 'Feet locked in, bar to lower chest. Use the safety pins.'),
    L('Lower chest', 'dips-chest', 'Chest dips, lean forward', 'Dip station', 3, '8-12', 90, 'strength', ['Lower chest'], ['Triceps', 'Front shoulders'], 'Lean forward, elbows out a little. Too hard? Do slow lowering only.'),
    L('Overall chest', 'pushup', 'Push-ups', 'Floor (hands on a bench to make it easier)', 3, 'as many as clean', 60, 'muscle', ['Chest'], ['Triceps', 'Core'], 'Body in a straight line, chest to the floor.')
  ]
};

const BICEPS_LIB = {
  key: 'bicepsPick', pick: true, focus: 'Biceps', short: 'Biceps',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    L('Biceps', 'bar-curl', 'Barbell curl', 'Fixed straight barbell from the rack', 4, '8-10', 90, 'strength', ['Biceps'], ['Forearms'], 'Elbows still at your sides, no leaning back.'),
    L('Biceps', 'ez-curl', 'EZ-bar curl', 'Fixed EZ barbell from the rack', 3, '8-10', 90, 'strength', ['Biceps'], ['Forearms'], 'Easier on the wrists than a straight bar.'),
    L('Biceps', 'curl-machine', 'Machine preacher curl', 'Biceps curl machine (plate loaded, preacher pad)', 3, '10-12', 60, 'muscle', ['Biceps'], ['Forearms'], 'Armpits on the top of the pad, full stretch at the bottom.'),
    L('Biceps', 'db-curl', 'Alternating dumbbell curl', 'Dumbbells, standing', 3, '10-12 each arm', 60, 'muscle', ['Biceps'], ['Forearms'], 'Turn the palm up as you lift, squeeze at the top.'),
    L('Biceps', 'incline-curl', 'Incline dumbbell curl', 'Adjustable bench at 45 degrees + dumbbells', 3, '10-12', 60, 'muscle', ['Biceps (long head)'], ['Forearms'], 'Arms hang straight down. The stretch grows the biceps.'),
    L('Biceps', 'preacher-db', 'Single arm dumbbell preacher curl', 'Biceps curl machine preacher pad + one dumbbell', 3, '10-12 each arm', 60, 'muscle', ['Biceps (short head)'], ['Forearms'], 'Lower slowly, stop just before the elbow locks.'),
    L('Biceps', 'ez-preacher', 'EZ-bar preacher curl', 'Biceps curl machine preacher pad + EZ barbell', 3, '10', 60, 'muscle', ['Biceps (short head)'], ['Forearms'], 'Keep the back of the arms on the pad the whole time.'),
    L('Biceps', 'cable-curl', 'Cable curl, straight bar', 'Cable low pulley, straight bar', 3, '12', 60, 'muscle', ['Biceps'], ['Forearms'], 'Constant tension. Elbows by your sides.'),
    L('Biceps', 'bayesian', 'Bayesian cable curl', 'Cable low pulley, D-handle, face away from the machine', 3, '12 each arm', 60, 'muscle', ['Biceps (long head)'], [], 'Arm behind the body for a big stretch, curl forward.'),
    L('Biceps', 'concentration', 'Concentration curl', 'Flat bench + one dumbbell, seated', 3, '12 each arm', 45, 'muscle', ['Biceps'], [], 'Elbow on the inner thigh, slow on the way down.'),
    L('Biceps', 'spider-curl', 'Spider curl', 'Adjustable bench at 45 degrees, chest on the pad + dumbbells', 3, '12', 45, 'muscle', ['Biceps (short head)'], [], 'Arms hang straight down in front of the bench.'),
    L('Biceps', 'chinup', 'Chin-ups, palms facing you', 'Pull-up bar on the Smith rack', 3, 'as many as clean', 90, 'strength', ['Biceps', 'Lats'], ['Forearms'], 'Too hard? Jump up and lower slowly for 3 to 5 seconds.'),
    L('Brachialis', 'hammer', 'Hammer curl', 'Dumbbells', 3, '10-12', 60, 'muscle', ['Brachialis (arm thickness)'], ['Forearms', 'Biceps'], 'Palms facing each other the whole time.'),
    L('Brachialis', 'cross-hammer', 'Cross-body hammer curl', 'Dumbbells', 3, '12 each arm', 60, 'muscle', ['Brachialis (arm thickness)'], ['Forearms'], 'Curl across the body toward the opposite chest.'),
    L('Brachialis', 'rope-hammer', 'Rope hammer curl', 'Cable low pulley, rope', 3, '12', 60, 'muscle', ['Brachialis (arm thickness)'], ['Forearms'], 'Neutral grip, pull the rope ends apart at the top.'),
    L('Forearms', 'reverse-curl', 'Reverse grip EZ-bar curl', 'Fixed EZ barbell, palms down', 3, '12', 60, 'muscle', ['Forearms'], ['Brachialis (arm thickness)'], 'Light weight, wrists straight.')
  ]
};

const TRICEPS_LIB = {
  key: 'tricepsPick', pick: true, focus: 'Triceps', short: 'Tris',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    L('All three heads', 'tri-press', 'Seated dip machine (triceps press)', 'Triceps press / seated dip machine (plate loaded)', 4, '8-10', 90, 'strength', ['Triceps'], ['Lower chest'], 'Shoulders down, push until arms are straight. Main lift.'),
    L('All three heads', 'close-grip', 'Close-grip bench press', 'Barbell or Smith machine + flat bench', 4, '8-10', 120, 'strength', ['Triceps'], ['Chest', 'Front shoulders'], 'Hands shoulder width, elbows close to the body.'),
    L('All three heads', 'dips', 'Parallel bar dips, upright', 'Dip station', 3, '8-12', 90, 'strength', ['Triceps'], ['Chest', 'Front shoulders'], 'Body upright to keep it on the triceps. Too hard? Slow lowering only.'),
    L('Long head', 'oh-ext', 'Seated overhead dumbbell extension', 'Adjustable bench upright + one dumbbell', 3, '10-12', 75, 'muscle', ['Triceps (long head)'], [], 'Elbows point up, lower behind the head for a deep stretch.'),
    L('Long head', 'cable-oh-ext', 'Overhead cable extension, rope', 'Cable pulley low or mid, rope, face away', 3, '12', 60, 'muscle', ['Triceps (long head)'], [], 'Lean forward a little, elbows by your ears.'),
    L('Long head', 'skull-ez', 'EZ-bar skull crusher', 'Fixed EZ barbell + flat bench', 3, '10', 75, 'muscle', ['Triceps (long head)'], [], 'Lower the bar behind the forehead, elbows stay pointing up.'),
    L('Long head', 'incline-skull', 'Incline skull crusher', 'EZ barbell or dumbbells + adjustable bench at 30 degrees', 3, '10', 75, 'muscle', ['Triceps (long head)'], [], 'More stretch than the flat version.'),
    L('Long head', 'lying-db-ext', 'Lying dumbbell extension', 'Flat bench + two dumbbells', 3, '12', 60, 'muscle', ['Triceps (long head)'], [], 'Palms facing each other, lower beside the head.'),
    L('Lateral head', 'rope-pushdown', 'Rope pushdown', 'Cable pulley high, rope', 3, '12', 60, 'muscle', ['Triceps (lateral head)'], [], 'Split the rope apart at the bottom.'),
    L('Lateral head', 'straight-bar', 'Straight bar pushdown', 'Cable pulley high, straight bar', 3, '12', 60, 'muscle', ['Triceps (lateral head)'], [], 'Squeeze 1 second at the bottom.'),
    L('Lateral head', 'vbar', 'V-bar pushdown', 'Cable pulley high, V-bar', 3, '12', 60, 'muscle', ['Triceps (lateral head)'], [], 'Elbows pinned to your sides.'),
    L('Lateral head', 'single-pushdown', 'Single arm cable pushdown', 'Cable pulley high, D-handle', 3, '12 each arm', 45, 'muscle', ['Triceps'], [], 'One arm at a time fixes a weaker side.'),
    L('Medial head', 'reverse-pushdown', 'Reverse grip pushdown', 'Cable pulley high, straight bar or D-handle, palms up', 3, '12', 45, 'muscle', ['Triceps (medial head)'], [], 'Palms up, elbows pinned.'),
    L('Medial head', 'kickback', 'Dumbbell kickback', 'Flat bench + one dumbbell', 3, '12 each arm', 45, 'muscle', ['Triceps'], [], 'Upper arm parallel to the floor, squeeze at the back.'),
    L('Medial head', 'cable-kickback', 'Cable kickback', 'Cable low pulley, no handle or D-handle', 3, '12 each arm', 45, 'muscle', ['Triceps'], [], 'Constant tension through the whole move.'),
    L('Bodyweight', 'diamond-pushup', 'Diamond push-ups', 'Floor (hands on a bench to make it easier)', 3, 'as many as clean', 60, 'muscle', ['Triceps'], ['Chest'], 'Hands together under the chest, elbows back.'),
    L('Bodyweight', 'bench-dips', 'Bench dips', 'Flat bench, feet on the floor', 3, '12-15', 60, 'muscle', ['Triceps'], ['Front shoulders'], 'Stay close to the bench, go down to 90 degrees only.')
  ]
};

const SHOULDERS_LIB = {
  key: 'shouldersPick', pick: true, focus: 'Shoulders', short: 'Delts',
  cardio: { name: 'Incline treadmill walk', detail: '20 min, incline 8 to 12, speed 4.5 to 5.5 km/h' },
  exercises: [
    L('Front delts', 'db-press', 'Seated dumbbell shoulder press', 'Adjustable bench upright + dumbbells', 4, '8-10', 120, 'strength', ['Front shoulders'], ['Side shoulders', 'Triceps'], 'Top pick for front delts in ACE tests. Do not lock elbows.'),
    L('Front delts', 'machine-press', 'Machine shoulder press', 'Shoulder press machine', 3, '10', 90, 'strength', ['Front shoulders'], ['Side shoulders', 'Triceps'], 'Handles start at chin height.'),
    L('Front delts', 'ohp', 'Standing barbell overhead press', 'Barbell from the Smith rack hooks', 4, '6-8', 150, 'strength', ['Front shoulders'], ['Side shoulders', 'Triceps', 'Core'], 'Squeeze glutes and abs, press the bar straight over the head.'),
    L('Front delts', 'smith-ohp', 'Seated Smith shoulder press', 'Smith machine + adjustable bench upright', 3, '8-10', 120, 'strength', ['Front shoulders'], ['Triceps'], 'Bar comes down in front of the face to chin level.'),
    L('Front delts', 'arnold', 'Arnold press', 'Adjustable bench upright + dumbbells', 3, '10', 90, 'strength', ['Front shoulders'], ['Side shoulders'], 'Start palms facing you, rotate out as you press.'),
    L('Side delts', 'db-lateral', 'Dumbbell lateral raise', 'Dumbbells', 4, '12-15', 45, 'muscle', ['Side shoulders'], ['Traps'], 'Pinkies slightly up, stop at shoulder height.'),
    L('Side delts', 'cable-lat', 'Single arm cable lateral raise', 'Cable low pulley, D-handle, cable crossing in front', 3, '12-15 each side', 45, 'muscle', ['Side shoulders'], [], 'Lead with the elbow. Constant tension.'),
    L('Side delts', 'machine-lateral', 'Machine lateral raise', 'Lateral raise machine', 3, '12-15', 45, 'muscle', ['Side shoulders'], [], 'Pads on the outside of the elbows, slow down.'),
    L('Side delts', 'upright-row', 'Wide grip upright row', 'EZ barbell or cable low pulley with straight bar', 3, '12', 60, 'muscle', ['Side shoulders'], ['Traps'], 'Hands wider than shoulders, pull to lower chest only.'),
    L('Side delts', 'cable-y', 'Cable Y-raise', 'Cable crossover, both pulleys low, cross the cables', 3, '12', 45, 'muscle', ['Side shoulders'], ['Rear shoulders'], 'Raise the arms in a Y shape above the head, light weight.'),
    L('Rear delts', 'rear-delt', 'Reverse pec deck', 'Pec Fly & Rear Delt machine (facing the pad)', 3, '15', 45, 'muscle', ['Rear shoulders'], ['Upper back'], 'Arms wide, pause at the back.'),
    L('Rear delts', 'bent-rev-fly', 'Bent-over dumbbell reverse fly', 'Dumbbells (or chest on an incline bench)', 3, '15', 45, 'muscle', ['Rear shoulders'], ['Upper back'], 'Flat back, lift out to the sides with soft elbows.'),
    L('Rear delts', 'face-pull', 'Cable face pull', 'Cable pulley at face height, rope', 3, '15', 60, 'muscle', ['Rear shoulders'], ['Upper back', 'Rotator cuff'], 'Pull to the forehead, elbows high. Keeps shoulders healthy.'),
    L('Rear delts', 'cable-rear', 'Cable rear delt fly', 'Cable crossover, pulleys at shoulder height, cross the cables', 3, '15', 45, 'muscle', ['Rear shoulders'], [], 'Pull the arms back and wide, thumbs up.'),
    L('Front delts', 'front-raise', 'Dumbbell front raise', 'Dumbbells (or one weight plate)', 3, '12', 60, 'muscle', ['Front shoulders'], [], 'Lift to eye level, no swinging.'),
    L('Front delts', 'cable-front', 'Cable front raise', 'Cable low pulley, straight bar or D-handle', 3, '12', 60, 'muscle', ['Front shoulders'], [], 'Face away from the machine, lift to eye level.'),
    L('Traps', 'shrug', 'Dumbbell shrug', 'Dumbbells', 3, '12-15', 60, 'muscle', ['Traps'], ['Forearms (grip)'], 'Straight up, hold 1 second at the top.'),
    L('Traps', 'bb-shrug', 'Barbell shrug', 'Barbell from the Smith rack hooks (or the Smith bar)', 3, '12', 60, 'muscle', ['Traps'], ['Forearms (grip)'], 'No rolling, just up and down.'),
    L('Rotator cuff', 'ext-rot', 'Cable external rotation', 'Cable pulley at elbow height, D-handle', 2, '15 each arm', 45, 'core', ['Rotator cuff'], ['Rear shoulders'], 'Elbow pinned to the side, rotate the hand out. Light and slow.')
  ]
};

const BACK_LIB = {
  key: 'backPick', pick: true, focus: 'Back', short: 'Back',
  cardio: { name: 'Spin bike', detail: '15 min, steady pace' },
  exercises: [
    L('Lats (width)', 'front-lat', 'Front lat pulldown, plate loaded', 'Plate loaded front lat pulldown (knee pads)', 4, '8-10', 120, 'strength', ['Lats (back width)'], ['Biceps', 'Rear shoulders'], 'Chest up, pull elbows down to your ribs. Main lift.'),
    L('Middle back (thickness)', 'seated-row', 'Chest-supported row, plate loaded', 'Plate loaded seated row (chest pad)', 4, '8-10', 120, 'strength', ['Mid back', 'Lats'], ['Rear shoulders', 'Biceps'], 'Chest on the pad, squeeze shoulder blades together 1 second.'),
    L('Middle back (thickness)', 'bb-row', 'Barbell bent-over row', 'Barbell (fixed or loaded)', 4, '8-10', 120, 'strength', ['Mid back', 'Lats'], ['Lower back', 'Biceps'], 'Hinge to about 45 degrees, flat back, pull to the belly button.'),
    L('Lats (width)', 'pullup', 'Pull-ups', 'Pull-up bar on the Smith rack', 3, 'as many as clean', 120, 'strength', ['Lats (back width)'], ['Biceps', 'Mid back'], 'Too hard? Jump up and lower slowly for 3 to 5 seconds.'),
    L('Middle back (thickness)', 'db-row', 'One arm dumbbell row', 'Flat bench + dumbbell', 3, '8-10 each arm', 90, 'strength', ['Lats', 'Mid back'], ['Biceps', 'Rear shoulders'], 'Back flat, pull to the hip, big stretch at the bottom.'),
    L('Lats (width)', 'wide-pull', 'Wide grip lat pulldown', 'Cable lat pulldown, long bar', 3, '10-12', 90, 'strength', ['Lats (back width)'], ['Biceps'], 'Hands just outside shoulders, pull to upper chest.'),
    L('Lats (width)', 'close-pull', 'Close / neutral grip pulldown', 'Cable lat pulldown, V-handle or MAG grip', 3, '10-12', 90, 'strength', ['Lats'], ['Mid back', 'Biceps'], 'Lean back only a little, squeeze the lats.'),
    L('Middle back (thickness)', 'cable-row', 'Seated cable row', 'Cable low pulley, V-handle, feet on the plate', 3, '10-12', 90, 'strength', ['Mid back', 'Lats'], ['Biceps'], 'Sit tall, pull to the belly, shoulder blades back.'),
    L('Middle back (thickness)', 'incline-row', 'Chest supported incline dumbbell row', 'Adjustable bench at 45 degrees + dumbbells, chest on the pad', 3, '10-12', 75, 'strength', ['Mid back'], ['Rear shoulders'], 'Elbows out wide for the upper back, no lower back strain.'),
    L('Middle back (thickness)', 'smith-row', 'Smith machine bent-over row', 'Smith machine', 3, '10', 90, 'strength', ['Mid back', 'Lats'], ['Biceps'], 'Same as the barbell row but the bar path is fixed.'),
    L('Middle back (thickness)', 'underhand-row', 'Underhand barbell row', 'Barbell, palms up', 3, '10', 90, 'strength', ['Lats', 'Mid back'], ['Biceps'], 'Elbows close, pull to the lower belly.'),
    L('Middle back (thickness)', 'single-cable-row', 'Single arm cable row', 'Cable low pulley, D-handle', 3, '12 each arm', 60, 'muscle', ['Lats'], ['Mid back'], 'Let the shoulder reach forward, then pull back to the hip.'),
    L('Lats (width)', 'straight-arm', 'Straight arm pulldown', 'Cable pulley high, straight bar or rope', 3, '12-15', 60, 'muscle', ['Lats'], ['Triceps', 'Core'], 'Arms nearly straight, pull to thighs.'),
    L('Lats (width)', 'db-pullover', 'Dumbbell pullover', 'Flat bench + one dumbbell', 3, '12', 60, 'muscle', ['Lats'], ['Chest'], 'Lower the dumbbell behind the head with soft elbows.'),
    L('Lower back', 'back-ext', 'Back extension', '45 degree back extension bench (hold a plate to make it harder)', 3, '12, slow', 60, 'core', ['Lower back'], ['Glutes', 'Hamstrings'], 'Stop when your body is a straight line. No arching.'),
    L('Lower back', 'rdl', 'Romanian deadlift', 'Barbell or dumbbells', 3, '8-10', 120, 'strength', ['Hamstrings (back thigh)', 'Lower back'], ['Glutes', 'Forearms (grip)'], 'Hips back, back flat, bar close to the legs. Skip it on a sore back day.'),
    L('Lower back', 'deadlift', 'Conventional deadlift', 'Barbell + plates from the floor', 3, '5-6', 180, 'strength', ['Lower back', 'Glutes', 'Hamstrings'], ['Lats', 'Forearms (grip)'], 'Learn it light first. Bar over mid foot, chest up, push the floor away.')
  ]
};

const LEGS_LIB = {
  key: 'legsPick', pick: true, focus: 'Legs', short: 'Legs',
  cardio: { name: 'Easy walk', detail: '10 min, flat' },
  exercises: [
    L('Quads (front thigh)', 'super-squat', 'Super squat', 'Super squat machine (red, shoulder pads)', 4, '8-10', 150, 'strength', ['Quads (front thigh)', 'Glutes'], ['Hamstrings', 'Core'], 'Deep as you can with a flat back, knees over toes. Main lift.'),
    L('Quads (front thigh)', 'leg-press', 'Leg press', '45 degree leg press, feet middle of the plate', 4, '10-12', 120, 'strength', ['Quads (front thigh)', 'Glutes'], ['Hamstrings'], 'Go deep, never lock the knees.'),
    L('Quads (front thigh)', 'bb-squat', 'Barbell back squat', 'Smith rack hooks + barbell (set the safety pins)', 4, '6-8', 180, 'strength', ['Quads (front thigh)', 'Glutes'], ['Hamstrings', 'Core', 'Lower back'], 'Bar on the upper back, sit down between the heels, chest up.'),
    L('Quads (front thigh)', 'smith-squat', 'Smith machine squat', 'Smith machine', 3, '10', 120, 'strength', ['Quads (front thigh)', 'Glutes'], ['Hamstrings', 'Core'], 'Feet slightly forward of the bar.'),
    L('Quads (front thigh)', 'leg-ext', 'Leg extension', 'Leg extension / leg curl machine', 3, '12-15', 60, 'muscle', ['Quads (front thigh)'], [], 'Pause 1 second at the top.'),
    L('Quads (front thigh)', 'split-squat', 'Bulgarian split squat', 'Flat bench + dumbbells', 3, '8-10 each leg', 90, 'strength', ['Quads (front thigh)', 'Glutes'], ['Hamstrings', 'Core (balance)'], 'Back foot on the bench, front knee over the toes.'),
    L('Quads (front thigh)', 'lunges', 'Walking lunges', 'Dumbbells (or bodyweight to start)', 3, '10 each leg', 90, 'strength', ['Quads', 'Glutes'], ['Hamstrings', 'Core (balance)'], 'Long steps, back knee close to the floor.'),
    L('Quads (front thigh)', 'goblet-squat', 'Goblet squat', 'One dumbbell held at the chest', 3, '10-12', 90, 'strength', ['Quads (front thigh)', 'Glutes'], ['Core'], 'Elbows inside the knees at the bottom.'),
    L('Quads (front thigh)', 'reverse-lunge', 'Dumbbell reverse lunge', 'Dumbbells', 3, '10 each leg', 75, 'strength', ['Quads', 'Glutes'], ['Hamstrings'], 'Step back, easier on the knees than forward lunges.'),
    L('Quads (front thigh)', 'step-up', 'Step-ups', 'Step platform or flat bench + dumbbells', 3, '10 each leg', 75, 'strength', ['Quads', 'Glutes'], ['Calves'], 'Push through the heel of the top foot.'),
    L('Hamstrings (back thigh)', 'leg-curl', 'Seated leg curl', 'Leg extension / leg curl machine, curl setting', 4, '10-12', 75, 'muscle', ['Hamstrings (back thigh)'], ['Calves'], 'Lean forward a little for more stretch. Slow on the way up.'),
    L('Hamstrings (back thigh)', 'lying-leg-curl', 'Lying leg curl', 'Lying leg curl machine', 3, '10-12', 75, 'muscle', ['Hamstrings (back thigh)'], ['Calves'], 'Hips pressed into the pad.'),
    L('Hamstrings (back thigh)', 'rdl', 'Romanian deadlift', 'Barbell or dumbbells', 3, '8-10', 120, 'strength', ['Hamstrings (back thigh)', 'Glutes'], ['Lower back', 'Forearms (grip)'], 'Hips back, back flat. Skip it on a sore back day.'),
    L('Hamstrings (back thigh)', 'good-morning', 'Good morning', 'Light barbell on the upper back (or the Smith bar)', 3, '10', 90, 'strength', ['Hamstrings (back thigh)', 'Lower back'], ['Glutes'], 'Soft knees, push the hips back until you feel a stretch. Go light.'),
    L('Glutes', 'hip-thrust', 'Hip thrust', 'Smith machine or barbell + flat bench, pad on the bar', 4, '8-10', 120, 'strength', ['Glutes'], ['Hamstrings'], 'Upper back on the bench, chin tucked, squeeze 1 second at the top.'),
    L('Glutes', 'glute-bridge', 'Glute bridge', 'Floor + barbell or a dumbbell on the hips', 3, '12', 60, 'muscle', ['Glutes'], ['Hamstrings'], 'Push through the heels, ribs down.'),
    L('Glutes', 'glute-kickback', 'Cable glute kickback', 'Cable low pulley, ankle strap', 3, '12 each leg', 45, 'muscle', ['Glutes'], [], 'Kick back and slightly out, do not arch the lower back.'),
    L('Glutes', 'add-abd', 'Abductor, then adductor', 'Adductor / abductor machine', 3, '15 each', 45, 'muscle', ['Outer hips (glutes)', 'Inner thighs'], [], 'Slow, no bouncing. Lean forward on the abductor for upper glutes.'),
    L('Calves', 'calf', 'Calf raise on the leg press', '45 degree leg press, balls of feet on the plate edge', 4, '12-15', 45, 'muscle', ['Calves'], [], 'Full stretch at the bottom, 1 second hold at the top.'),
    L('Calves', 'seated-calf', 'Seated calf raise', 'Seated calf raise machine', 3, '15', 45, 'muscle', ['Calves'], [], 'Bent knees hit the lower calf (soleus).'),
    L('Calves', 'smith-calf', 'Standing calf raise', 'Smith machine or dumbbells, toes on a plate or step', 3, '12-15', 45, 'muscle', ['Calves'], [], 'Straight knees, slow and full range.')
  ]
};

/* What each exercise works and what it is for. Shown on every card.
   main: muscles doing most of the work. also: helpers. goal: a key from GOALS. */
export const GOALS = {
  strength: { label: 'Strength + muscle', why: 'Big lift: builds strength and burns the most calories of any lift.' },
  muscle: { label: 'Muscle growth', why: 'Targets one muscle to build size and shape.' },
  core: { label: 'Core strength', why: 'Protects your lower back and helps every other lift.' },
  fatburn: { label: 'Fat burn', why: 'Raises heart rate and burns fat. Good for heart health.' },
  warmup: { label: 'Warm up', why: 'Gets blood flowing so joints and muscles are ready.' },
  recovery: { label: 'Recovery', why: 'Helps muscles repair so you come back stronger.' }
};

const TARGETS = {
  warmup: { main: ['Whole body'], also: [], goal: 'warmup' },
  // Biceps + triceps
  'curl-machine': { main: ['Biceps'], also: ['Forearms'], goal: 'muscle' },
  'preacher-db': { main: ['Biceps (lower part)'], also: ['Forearms'], goal: 'muscle' },
  'bar-curl': { main: ['Biceps'], also: ['Forearms', 'Front shoulders'], goal: 'strength' },
  'tri-press': { main: ['Triceps'], also: ['Lower chest', 'Front shoulders'], goal: 'strength' },
  vbar: { main: ['Triceps (outer)'], also: [], goal: 'muscle' },
  'straight-bar': { main: ['Triceps'], also: [], goal: 'muscle' },
  hammer: { main: ['Biceps', 'Forearms'], also: ['Brachialis (arm thickness)'], goal: 'muscle' },
  'oh-ext': { main: ['Triceps (long head)'], also: ['Core'], goal: 'muscle' },
  // Chest + shoulders
  'pec-fly': { main: ['Chest'], also: ['Front shoulders'], goal: 'muscle' },
  'incline-smith': { main: ['Upper chest'], also: ['Front shoulders', 'Triceps'], goal: 'strength' },
  'flat-press': { main: ['Chest'], also: ['Front shoulders', 'Triceps'], goal: 'strength' },
  'chest-press': { main: ['Chest'], also: ['Front shoulders', 'Triceps'], goal: 'strength' },
  'db-press': { main: ['Shoulders (front + side)'], also: ['Triceps', 'Upper chest'], goal: 'strength' },
  'cable-lat': { main: ['Side shoulders'], also: ['Traps'], goal: 'muscle' },
  'db-lateral': { main: ['Side shoulders'], also: ['Traps'], goal: 'muscle' },
  'incline-fly': { main: ['Upper chest'], also: ['Front shoulders'], goal: 'muscle' },
  // Back + light legs
  'front-lat': { main: ['Lats (back width)'], also: ['Biceps', 'Rear shoulders'], goal: 'strength' },
  'close-pull': { main: ['Lats', 'Mid back'], also: ['Biceps'], goal: 'strength' },
  'seated-row': { main: ['Mid back', 'Lats'], also: ['Rear shoulders', 'Biceps'], goal: 'strength' },
  'db-row': { main: ['Lats', 'Mid back'], also: ['Biceps', 'Rear shoulders'], goal: 'strength' },
  'rear-delt': { main: ['Rear shoulders'], also: ['Upper back'], goal: 'muscle' },
  'back-ext': { main: ['Lower back'], also: ['Glutes', 'Hamstrings'], goal: 'core' },
  'leg-press-light': { main: ['Quads (front thigh)', 'Glutes'], also: ['Hamstrings'], goal: 'strength' },
  'leg-ext-light': { main: ['Quads (front thigh)'], also: [], goal: 'muscle' },
  plank: { main: ['Core (abs)'], also: ['Shoulders', 'Lower back'], goal: 'core' },
  'straight-arm': { main: ['Lats'], also: ['Triceps', 'Core'], goal: 'muscle' },
  shrug: { main: ['Traps'], also: ['Forearms (grip)'], goal: 'muscle' },
  // Legs
  'leg-press': { main: ['Quads (front thigh)', 'Glutes'], also: ['Hamstrings', 'Calves'], goal: 'strength' },
  'super-squat': { main: ['Quads (front thigh)', 'Glutes'], also: ['Hamstrings', 'Core'], goal: 'strength' },
  rdl: { main: ['Hamstrings (back thigh)', 'Glutes'], also: ['Lower back', 'Forearms (grip)'], goal: 'strength' },
  'leg-ext': { main: ['Quads (front thigh)'], also: [], goal: 'muscle' },
  'leg-curl': { main: ['Hamstrings (back thigh)'], also: ['Calves'], goal: 'muscle' },
  'add-abd': { main: ['Inner thighs', 'Outer hips (glutes)'], also: [], goal: 'muscle' },
  calf: { main: ['Calves'], also: [], goal: 'muscle' },
  'front-lat-sat': { main: ['Lats (back width)'], also: ['Biceps', 'Rear shoulders'], goal: 'strength' },
  'plank-sat': { main: ['Core (abs)'], also: ['Shoulders', 'Lower back'], goal: 'core' },
  lunges: { main: ['Quads', 'Glutes'], also: ['Hamstrings', 'Core (balance)'], goal: 'strength' },
  'smith-squat': { main: ['Quads (front thigh)', 'Glutes'], also: ['Hamstrings', 'Core'], goal: 'strength' },
  // Added with the 26 Oct week
  'db-flat-press': { main: ['Chest'], also: ['Front shoulders', 'Triceps'], goal: 'strength' },
  'cable-fly': { main: ['Lower chest'], also: ['Front shoulders'], goal: 'muscle' },
  pushup: { main: ['Chest'], also: ['Triceps', 'Core'], goal: 'muscle' },
  arnold: { main: ['Shoulders (front + side)'], also: ['Triceps'], goal: 'strength' },
  'front-raise': { main: ['Front shoulders'], also: ['Upper chest'], goal: 'muscle' },
  'face-pull': { main: ['Rear shoulders', 'Upper back'], also: ['Rotator cuff'], goal: 'muscle' },
  'cable-curl': { main: ['Biceps'], also: ['Forearms'], goal: 'muscle' },
  'incline-curl': { main: ['Biceps (long head)'], also: ['Forearms'], goal: 'muscle' },
  'rope-pushdown': { main: ['Triceps (outer)'], also: [], goal: 'muscle' },
  'reverse-pushdown': { main: ['Triceps (inner)'], also: ['Forearms'], goal: 'muscle' },
  'plank-fri': { main: ['Core (abs)'], also: ['Shoulders', 'Lower back'], goal: 'core' },
  'goblet-squat': { main: ['Quads (front thigh)', 'Glutes'], also: ['Core'], goal: 'strength' },
  // Added with the balanced week (1 Nov 2026)
  'cable-crunch': { main: ['Abs'], also: ['Obliques'], goal: 'core' },
  'leg-raise': { main: ['Lower abs'], also: ['Hip flexors'], goal: 'core' },
  'wide-pull': { main: ['Lats (back width)'], also: ['Biceps', 'Rear shoulders'], goal: 'strength' },
  'incline-row': { main: ['Upper back', 'Rear shoulders'], also: ['Side shoulders', 'Lats', 'Biceps'], goal: 'strength' },
  'incline-db': { main: ['Upper chest'], also: ['Front shoulders', 'Triceps'], goal: 'strength' },
  'hip-thrust': { main: ['Glutes'], also: ['Hamstrings', 'Core'], goal: 'strength' },
  'back-ext-glute': { main: ['Glutes', 'Hamstrings'], also: ['Lower back'], goal: 'strength' },
  'leg-press-high': { main: ['Glutes', 'Hamstrings'], also: ['Quads'], goal: 'strength' },
  'split-squat': { main: ['Glutes', 'Quads'], also: ['Hamstrings', 'Core (balance)'], goal: 'strength' },
  // Cardio and rest-day tasks
  cardio: { main: ['Heart + lungs'], also: ['Legs'], goal: 'fatburn' },
  walk: { main: ['Heart + lungs'], also: ['Legs'], goal: 'fatburn' },
  weigh: { main: [], also: [], goal: '' },
  stretch: { main: ['Hips', 'Hamstrings', 'Lower back'], also: [], goal: 'recovery' }
};

// Attach the info so every card can read e.main / e.also / e.goal.
const attach = (o, id) => Object.assign(o, TARGETS[id] || { main: [], also: [], goal: '' });
attach(WARMUP, 'warmup');
[CHEST_ONLY, BACK_ONLY, SHOULDERS_ONLY, BICEPS_ONLY, TRICEPS_ONLY, LEGS_ONLY, ARMS, CHEST, BACK, LEGS, CHEST_DAY, SHOULDERS, ARMS_PLUS, LEG_DAY, PUSH_A, PULL_A, LEGS_A, SHOULDER_BACK, PUSH_B, LEGS_B].forEach((w) => { w.exercises.forEach((e) => attach(e, e.id)); attach(w.cardio, 'cardio'); });
REST.tasks.forEach((t) => attach(t, t.id));
[CHEST_LIB, BICEPS_LIB, TRICEPS_LIB, SHOULDERS_LIB, BACK_LIB, LEGS_LIB].forEach((w) => attach(w.cardio, 'cardio'));

// Older workouts stay so days logged under them keep their history.
// They are hidden from the day pickers unless a day already uses one.
[CHEST_DAY, ARMS, BACK, SHOULDERS, ARMS_PLUS, LEG_DAY, CHEST, LEGS, PUSH_A, PULL_A, LEGS_A, SHOULDER_BACK, PUSH_B, LEGS_B, CHEST_ONLY, BACK_ONLY, SHOULDERS_ONLY, BICEPS_ONLY, TRICEPS_ONLY, LEGS_ONLY].forEach((w) => { w.old = true; });

// Every workout the schedule can use, by key. The pick-your-own week comes first.
export const WORKOUTS = {
  chestPick: CHEST_LIB, bicepsPick: BICEPS_LIB, tricepsPick: TRICEPS_LIB, shouldersPick: SHOULDERS_LIB, backPick: BACK_LIB, legsPick: LEGS_LIB,
  chestOnly: CHEST_ONLY, backOnly: BACK_ONLY, shouldersOnly: SHOULDERS_ONLY, bicepsOnly: BICEPS_ONLY, tricepsOnly: TRICEPS_ONLY, legsOnly: LEGS_ONLY,
  pushA: PUSH_A, pullA: PULL_A, legsA: LEGS_A, shoback: SHOULDER_BACK, chestarms: PUSH_B, legsB: LEGS_B,
  chest: CHEST_DAY, arms: ARMS, back: BACK, shoulders: SHOULDERS, armsplus: ARMS_PLUS, legday: LEG_DAY,
  push: CHEST, legs: LEGS, rest: REST
};

// Default week. Index matches Date.getDay(): 0 = Sunday.
// One muscle per day, pick your own exercises: Mon chest, Tue biceps, Wed triceps, Thu shoulders, Fri back, Sat legs, Sun rest.
export const SCHEDULE = ['rest', 'chestPick', 'bicepsPick', 'tricepsPick', 'shouldersPick', 'backPick', 'legsPick'];
// Raised when the default week changes, so the app moves to it once (logged days keep their workout).
export const PLAN_VERSION = 4;
// How many exercises finish a pick-your-own day, unless you choose another number that day.
export const PICK_GOAL = 6;
export const PICK_CHOICES = [6, 7, 8];

// The week used before October 2026 (Mon/Thu arms, Tue/Fri chest).
// Old saved days without a workout stamp are read with this, so history stays correct.
export const LEGACY_SCHEDULE = ['rest', 'arms', 'push', 'back', 'arms', 'push', 'legs'];

export const PROGRAM_START = '2026-10-19';

export const HABITS = [
  { id: 'water', name: 'Water 3 to 4 litres' },
  { id: 'steps', name: '10,000+ steps' },
  { id: 'sleep', name: 'Slept 7 to 8 hours' },
  { id: 'nojunk', name: 'No sugar, cold drinks or fried snacks' }
];

// About 130 g protein without whey, about 145 g with one scoop. Budget veg, no daily paneer.
// Navratri: no eggs; swap roti and chilla for kuttu or rajgira roti / sabudana khichdi with peanuts,
// and lean on milk, dahi, paneer (a little), makhana and peanuts. Soya and dal are skipped in many homes then.
export const MEALS = [
  { id: 'breakfast', name: 'Breakfast, about 27 g protein', detail: '3 moong dal chilla (90 g dal) + 1 katori dahi. Non-Navratri option: 3 egg omelette + 2 roti.' },
  { id: 'milk', name: 'Mid-morning, about 8 g', detail: '1 glass milk (250 ml) + 1 fruit' },
  { id: 'lunch', name: 'Lunch, about 34 g', detail: '3 roti, 1.5 katori dal or rajma/chole, sabzi with 25 g soya chunks, salad' },
  { id: 'snack', name: 'Evening, about 8 g', detail: '40 g roasted chana or sprouts chaat + 1 seasonal fruit' },
  { id: 'post', name: 'After the gym, about 8 to 24 g', detail: '1 glass milk, or 1 scoop whey in water if you use it' },
  { id: 'dinner', name: 'Dinner, about 37 g', detail: 'Soya chunks sabzi (50 g dry) or 100 g tofu, 2 roti, sabzi, 1 katori dahi, 1 tsp oil' },
  { id: 'bed', name: 'Before bed, about 8 g', detail: 'Haldi milk (1 glass), or skip if you are already at your protein target' }
];
