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
[ARMS, CHEST, BACK, LEGS, CHEST_DAY, SHOULDERS, ARMS_PLUS, LEG_DAY, PUSH_A, PULL_A, LEGS_A, SHOULDER_BACK, PUSH_B, LEGS_B].forEach((w) => { w.exercises.forEach((e) => attach(e, e.id)); attach(w.cardio, 'cardio'); });
REST.tasks.forEach((t) => attach(t, t.id));

// Older workouts stay so days logged under them keep their history.
// They are hidden from the day pickers unless a day already uses one.
[CHEST_DAY, ARMS, BACK, SHOULDERS, ARMS_PLUS, LEG_DAY, CHEST, LEGS].forEach((w) => { w.old = true; });

// Every workout the schedule can use, by key. The balanced week comes first.
export const WORKOUTS = {
  pushA: PUSH_A, pullA: PULL_A, legsA: LEGS_A, shoback: SHOULDER_BACK, chestarms: PUSH_B, legsB: LEGS_B,
  chest: CHEST_DAY, arms: ARMS, back: BACK, shoulders: SHOULDERS, armsplus: ARMS_PLUS, legday: LEG_DAY,
  push: CHEST, legs: LEGS, rest: REST
};

// Default week. Index matches Date.getDay(): 0 = Sunday.
// Mon chest + triceps, Tue back + biceps, Wed legs (quads), Thu shoulders + back,
// Fri chest + arms, Sat legs (glutes + hamstrings), Sun rest.
// Each muscle twice a week: chest Mon/Fri, back Tue/Thu, shoulders Mon/Thu (+Tue rear), arms Mon/Tue/Fri, legs Wed/Sat, abs Mon/Wed/Fri.
export const SCHEDULE = ['rest', 'pushA', 'pullA', 'legsA', 'shoback', 'chestarms', 'legsB'];
export const PLAN_VERSION = 2;

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
