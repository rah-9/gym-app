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
  // Cardio and rest-day tasks
  cardio: { main: ['Heart + lungs'], also: ['Legs'], goal: 'fatburn' },
  walk: { main: ['Heart + lungs'], also: ['Legs'], goal: 'fatburn' },
  weigh: { main: [], also: [], goal: '' },
  stretch: { main: ['Hips', 'Hamstrings', 'Lower back'], also: [], goal: 'recovery' }
};

// Attach the info so every card can read e.main / e.also / e.goal.
const attach = (o, id) => Object.assign(o, TARGETS[id] || { main: [], also: [], goal: '' });
attach(WARMUP, 'warmup');
[ARMS, CHEST, BACK, LEGS].forEach((w) => { w.exercises.forEach((e) => attach(e, e.id)); attach(w.cardio, 'cardio'); });
REST.tasks.forEach((t) => attach(t, t.id));

// Every workout the schedule can use, by key.
export const WORKOUTS = { push: CHEST, arms: ARMS, back: BACK, legs: LEGS, rest: REST };

// Default week. Index matches Date.getDay(): 0 = Sunday.
// Push day first, arms the day after, back mid-week, then repeat, legs on Saturday.
export const SCHEDULE = ['rest', 'push', 'arms', 'back', 'push', 'arms', 'legs'];

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

export const MEALS = [
  { id: 'breakfast', name: 'Breakfast', detail: '2 besan or moong chilla (or poha with peanuts), 1 glass milk, 1 banana. Eggs optional 2 to 3 days a week.' },
  { id: 'lunch', name: 'Lunch', detail: '2 roti + small rice, big katori dal or rajma/chole, sabzi, dahi, salad' },
  { id: 'snack', name: 'Evening snack', detail: 'Sprouts chaat or 40 g roasted chana + 1 seasonal fruit' },
  { id: 'dinner', name: 'Dinner', detail: 'Soya chunks sabzi (50 g dry), 2 roti, sabzi, 1 tsp oil' },
  { id: 'bed', name: 'Before bed', detail: 'Haldi milk or dahi + small handful of peanuts' }
];
