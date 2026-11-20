import type { CurriculumModule } from '../types';

export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: 'mod-earthquake',
    hazard: 'Earthquake',
    title: 'Earthquake Zone III–V Classroom & Hostel Protocol',
    ndmaCode: 'NDMA-SS-EQ-2016',
    imagePath: '/src/assets/images/module_earthquake_drill_1795188744822.jpg',
    overview:
      'Over 59% of India lies in moderate-to-severe seismic zones (III, IV, and V). Structured classroom drills prevent panic stampedes and falling-debris head trauma.',
    duringSteps: [
      'Drop onto hands and knees immediately before seismic waves knock you off balance.',
      'Take cover beneath a sturdy wooden desk or crouch against an interior RCC pillar—away from glass windows, ceiling fans, and tall almirahs.',
      'Hold onto the desk leg firmly and shield your head/neck with your free arm or a hardcover book until shaking stops.',
    ],
    afterSteps: [
      'Evacuate calmly in single file via designated staircases—never use campus lifts/elevators.',
      'Lab staff isolate LPG gas valves and main MCB electrical switches before exiting.',
      'Assemble 15m clear of buildings and boundary walls; complete class-wise attendance headcount.',
    ],
    minorInjuryGuide:
      'Minor dust irritation or small scrape: rinse with clean drinking water, pat dry with sterile gauze, apply Savlon/Betadine around edges, and cover with an adhesive strip.',
    majorInjuryGuide:
      'Suspected spinal/neck injury from falling plaster: DO NOT move the victim unless ceiling collapse is imminent. Stabilize head neutrally and call 108. For deep lacerations, apply continuous firm gauze pressure.',
    improvisedResources: [
      'Hardcover textbook or stuffed backpack used as an immediate head shield during shaking.',
      'Wooden meter ruler or folded thick notebooks padded with sweaters to splint limb fractures.',
      'Clean cotton handkerchief or dupatta for direct bleeding compression if medikit is on another floor.',
    ],
    quiz: [
      {
        id: 'eq-q1',
        question: 'During active earthquake shaking inside a 2nd-floor classroom, what should students do first?',
        options: [
          'Run immediately toward the staircase',
          'Drop, Cover under a sturdy desk, and Hold On',
          'Take the elevator to the ground floor',
          'Stand near classroom windows to check outside',
        ],
        correctIndex: 1,
        explanation: 'Drop, Cover, and Hold On protects students from falling ceiling plaster and glass while avoiding stairwell crush injuries.',
      },
      {
        id: 'eq-q2',
        question: 'Why must elevators/lifts NEVER be used after an earthquake?',
        options: [
          'They are slower than walking',
          'Power outages or shaft misalignment can trap occupants inside',
          'They consume too much electricity',
          'Teachers need them exclusively',
        ],
        correctIndex: 1,
        explanation: 'Seismic shear shifts lift rails and triggers power cuts, trapping evacuees during dangerous aftershocks.',
      },
      {
        id: 'eq-q3',
        question: 'If a student suffers a fall and complains of severe neck pain and numbness, what is the correct action?',
        options: [
          'Carry them quickly down the stairs',
          'Do NOT move them unless an immediate life-threatening hazard forces relocation; stabilize head and call 108',
          'Make them sit upright and drink water',
          'Pull their arms to check mobility',
        ],
        correctIndex: 1,
        explanation: 'Moving a suspected spinal injury can cause permanent paralysis; keep head/neck immobilized in neutral alignment.',
      },
    ],
  },
  {
    id: 'mod-fire',
    hazard: 'Fire',
    title: 'Campus Fire, Toxic Smoke & Extinguisher SOP',
    ndmaCode: 'NBC-PART4-FIRE',
    imagePath: '/src/assets/images/module_fire_evacuation_1795188744746.jpg',
    overview:
      'Short circuits in computer labs, hostels, and chemistry laboratories require instant extinguisher selection (ABC/CO2) and low-crawl smoke evacuation.',
    duringSteps: [
      'Trigger the nearest manual fire alarm call point and dial 101 / 112 immediately.',
      'Check closed doors with the back of your hand—never open a hot door.',
      'If smoke fills corridors, crawl low (30–45 cm above floor) breathing through a damp cotton cloth.',
    ],
    afterSteps: [
      'Use CO2 or ABC dry-powder extinguishers via PASS (Pull, Aim at base, Squeeze, Sweep) only on small fires with a clear exit behind you.',
      'Never throw water onto electrical or chemical fires.',
      'If clothing catches fire: Stop, Drop, and Roll wrapped in a heavy woollen or fire blanket.',
    ],
    minorInjuryGuide:
      '1st-degree scald or minor burn: hold under cool (not ice-cold) running water for 15–20 minutes, remove rings/watches before swelling, and cover loosely with non-stick sterile gauze or cling film.',
    majorInjuryGuide:
      'Large/deep burns or smoke inhalation: call 108 immediately, NEVER peel clothing stuck to skin, drape loosely with clean sterile sheet, and monitor breathing for shock.',
    improvisedResources: [
      'Wet cotton dupatta, handkerchief, or lab towel over nose/mouth to filter smoke particles.',
      'Dry sand buckets outside labs to smother small chemical or electrical spark fires.',
      'Clean food-grade plastic cling wrap or freshly ironed cotton cloth to cover cooled minor burns.',
    ],
    quiz: [
      {
        id: 'fr-q1',
        question: 'What does the "A" stand for in the PASS fire extinguisher technique?',
        options: [
          'Aim at the top of the smoke',
          'Aim the nozzle at the BASE of the fire',
          'Alert all classrooms first',
          'Activate the ceiling sprinklers',
        ],
        correctIndex: 1,
        explanation: 'Aiming at the fuel base extinguishes combustion; spraying the top of flames wastes agent.',
      },
      {
        id: 'fr-q2',
        question: 'Which substance should NEVER be applied to a minor burn?',
        options: [
          'Cool running tap water for 15–20 minutes',
          'Sterile non-stick gauze',
          'Toothpaste, butter, ghee, or direct ice',
          'Clean cling wrap after cooling',
        ],
        correctIndex: 2,
        explanation: 'Toothpaste, butter, and ice trap heat inside tissues and cause severe secondary infection.',
      },
      {
        id: 'fr-q3',
        question: 'How should you test a closed classroom door before opening it during a fire alarm?',
        options: [
          'Kick it open quickly',
          'Touch the handle and upper panel with the back of your hand',
          'Look through the keyhole',
          'Pour water under the door',
        ],
        correctIndex: 1,
        explanation: 'Using the back of your hand prevents involuntary muscle spasm gripping a scorching metal knob.',
      },
    ],
  },
  {
    id: 'mod-flood',
    hazard: 'Flood',
    title: 'Monsoon Flood, Electrocution & Shelter Readiness',
    ndmaCode: 'NDMA-MONSOON-04',
    imagePath: '/src/assets/images/module_flood_safety_1795188744664.jpg',
    overview:
      'Urban waterlogging in Indian school campuses creates concealed electrical hazards, open drain dangers, and waterborne illness risks.',
    duringSteps: [
      'Isolate ground-floor main electrical MCBs using dry footwear/insulated gloves before water reaches sockets.',
      'Relocate students, medikits, drinking water, and attendance registers to 1st/2nd floors or dry terraces.',
      'Never walk or wade through moving floodwater deeper than 15 cm.',
    ],
    afterSteps: [
      'Boil or treat drinking water with chlorine tablets; distribute ORS for dehydration.',
      'Keep cuts covered with waterproof dressings to avoid leptospirosis infection.',
      'Wait for official campus/SDRF clearance before dismissing students.',
    ],
    minorInjuryGuide:
      'Mild dehydration, shivering, or floodwater scrape: wash skin thoroughly with soap and clean bottled water, apply antiseptic, wrap in dry blanket, and sip ORS.',
    majorInjuryGuide:
      'Snakebite during floods: keep victim calm and motionless, immobilize bitten limb below heart level with loose splint, and call 108. NEVER cut, suck venom, or apply tight tourniquets.',
    improvisedResources: [
      'Homemade ORS: 1 liter boiled cooled water + 6 level teaspoons sugar + 1/2 teaspoon salt.',
      'Sealed empty plastic bottles tied inside a backpack as an emergency buoyancy float.',
      'Elevated library tables/benches to keep medical kits and registers dry.',
    ],
    quiz: [
      {
        id: 'fl-q1',
        question: 'Why is moving floodwater just 15 cm (ankle-deep) dangerous on a campus road?',
        options: [
          'It ruins school shoes',
          'Fast current can knock students off balance and hide open drains or live submerged wires',
          'It makes attendance registers wet',
          'It slows down bicycles',
        ],
        correctIndex: 1,
        explanation: 'Just 15 cm of swift water can sweep a person down, concealing open manholes and electrified poles.',
      },
      {
        id: 'fl-q2',
        question: 'What is the correct first-aid for a flood-displaced snakebite on campus?',
        options: [
          'Cut the bite marks and suck out venom',
          'Tie a tight rope tourniquet above the wound',
          'Keep victim calm, immobilize limb below heart level, and call 108 for anti-venom',
          'Make the victim run to the nearest clinic',
        ],
        correctIndex: 2,
        explanation: 'Calm immobilization slows venom spread through the lymphatic system while awaiting anti-venom.',
      },
      {
        id: 'fl-q3',
        question: 'If commercial ORS packets run out during flood sheltering, what is the WHO homemade ORS ratio per 1 liter of clean water?',
        options: [
          '6 tsp salt + 1/2 tsp sugar',
          '6 level tsp sugar + 1/2 tsp salt',
          '2 tbsp baking soda + lemon',
          '1 cup milk + salt',
        ],
        correctIndex: 1,
        explanation: 'WHO standard emergency ORS uses 6 level teaspoons of sugar and half a teaspoon of salt in 1 liter of boiled/clean water.',
      },
    ],
  },
  {
    id: 'mod-firstaid',
    hazard: 'FirstAid',
    title: 'Campus Medikit Triage: Minor vs. Major Trauma Care',
    ndmaCode: 'IRCS-TRAUMA-SOP',
    imagePath: '/src/assets/images/module_medikit_firstaid_1795188744482.jpg',
    overview:
      'Rapid triage separates minor classroom scrapes/sprains from life-threatening bleeding, fractures, burns, and cardiac arrest using standard medikits or improvised school supplies.',
    duringSteps: [
      'Scene safety first: wear disposable gloves before touching blood or bodily fluids.',
      'Triage immediately: Red/Major (severe bleeding, unconsciousness, spinal/head trauma, large burns) -> Call 108/112.',
      'Yellow/Minor (small cuts, mild sprains, nosebleeds, 1st-degree scalds) -> Treat cleanly at assembly station.',
    ],
    afterSteps: [
      'For heavy bleeding: apply firm continuous direct pressure; add fresh gauze on top if soaked (never peel off bottom clot layer).',
      'For sprains (Moch): apply RICE (Rest, Ice wrapped in cloth, Crepe compression, Elevation).',
      'For nosebleed (Nakseer): sit upright, lean FORWARD (never back), pinch soft nose for 10 continuous minutes.',
    ],
    minorInjuryGuide:
      'Minor cuts, sprains, nosebleeds, mild fainting: Irrigate cuts with clean water + Savlon; wrap sprains snugly with crepe bandage; lean nosebleeds forward; elevate legs 30cm for fainting.',
    majorInjuryGuide:
      'Severe arterial bleeding, compound fractures, unconsciousness: Call 108 immediately; never pull out embedded glass; splint fractures across both adjacent joints; start Hands-Only CPR (100–120 compressions/min) if not breathing.',
    improvisedResources: [
      'Folded clean cotton t-shirt or dupatta for heavy trauma compression pads.',
      'Hardcover textbook, wooden scale, or folded cardboard padded with towels for emergency splinting.',
      'Clean bottled drinking water for 20-minute burn cooling or chemical eye flushing.',
    ],
    quiz: [
      {
        id: 'fa-q1',
        question: 'If blood soaks through the first sterile gauze pad on a deep wound, what should you do?',
        options: [
          'Pull the soaked pad off and wash the wound',
          'Leave the soaked pad in place and stack fresh gauze firmly on top',
          'Apply turmeric powder directly',
          'Leave the wound uncovered to air dry',
        ],
        correctIndex: 1,
        explanation: 'Removing the first pad tears away forming blood clots; layering new gauze maintains continuous pressure.',
      },
      {
        id: 'fa-q2',
        question: 'How should a student with a sudden nosebleed (nakseer) be positioned?',
        options: [
          'Lie flat on their back with head tilted backward',
          'Sit upright, lean slightly FORWARD, and pinch soft part of nose for 10 minutes',
          'Tilt head all the way back and sniff inward',
          'Run to wash face repeatedly',
        ],
        correctIndex: 1,
        explanation: 'Leaning forward prevents blood from draining down the throat and causing choking or vomiting.',
      },
      {
        id: 'fa-q3',
        question: 'What is the correct chest compression rate for Hands-Only CPR on an unresponsive non-breathing adult/teen?',
        options: [
          '40–50 compressions per minute',
          '100–120 compressions per minute in the center of the chest',
          '10 compressions followed by water',
          'Only check pulse every 5 minutes',
        ],
        correctIndex: 1,
        explanation: '100–120 compressions per minute at 5 cm depth maintains vital brain and heart perfusion until 108 arrives.',
      },
    ],
  },
];
