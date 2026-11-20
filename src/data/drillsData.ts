import type { DrillScenario } from '../types';

export const DRILL_SCENARIOS: DrillScenario[] = [
  {
    id: 'drill-earthquake',
    hazard: 'Earthquake',
    title: 'Seismic Zone IV Classroom & Corridor Drill',
    location: 'Academic Block B — Room 204 (2nd Floor)',
    difficulty: 'Critical',
    summary:
      'Simulate a sudden 6.2 magnitude tremor during a live lecture, practice Drop-Cover-Hold On, isolate lab gas/power, and execute staircase evacuation with an injured classmate.',
    ndmaRef: 'NDMA National School Safety Policy (2016)',
    initialZoneId: 'classroom',
    zones: [
      { id: 'classroom', label: 'Classroom 204', x: 32, y: 34, w: 220, h: 150, kind: 'room' },
      { id: 'chemlab', label: 'Chemistry Lab', x: 274, y: 34, w: 180, h: 150, kind: 'room' },
      { id: 'corridor', label: '2nd Floor Corridor', x: 32, y: 204, w: 422, h: 66, kind: 'corridor' },
      { id: 'stairwell', label: 'Fire Stairwell A', x: 476, y: 34, w: 112, h: 236, kind: 'stairwell' },
      { id: 'elevator', label: 'Lift Shaft (Unsafe)', x: 32, y: 292, w: 140, h: 78, kind: 'utility' },
      { id: 'assembly', label: 'Open Assembly Zone B', x: 204, y: 292, w: 384, h: 78, kind: 'assembly' },
    ],
    steps: [
      {
        id: 'eq-s1',
        phaseTitle: 'Phase 1: Primary Tremor Onset (0–10s)',
        prompt:
          'Ceiling fans sway violently, chalk dust falls from the lintel, and window panes rattle. 48 students are seated at wooden benches. What is your immediate command?',
        timeLimitSec: 20,
        activeHazardLabel: 'ACTIVE SEISMIC SHAKING · MAGNITUDE 6.2',
        choices: [
          {
            id: 'eq-s1-a',
            label: 'Execute Drop, Cover under sturdy wooden desks, and Hold On away from windows',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct per NDMA SOP [NDMA-EQ-01]. Dropping under sturdy desks shields heads from falling plaster and shattered glass while preventing falls.',
            nextZoneId: 'classroom',
            hazardDelta: -15,
          },
          {
            id: 'eq-s1-b',
            label: 'Rush all 48 students immediately into the corridor and down the stairs',
            isOptimal: false,
            points: 4,
            feedback:
              'Unsafe during active shaking. Running on vibrating stairs causes crush stampedes and glass/plaster head injuries.',
            nextZoneId: 'corridor',
            hazardDelta: 20,
          },
          {
            id: 'eq-s1-c',
            label: 'Stand near the corridor glass windows to watch the courtyard',
            isOptimal: false,
            points: 0,
            feedback:
              'Critical hazard. Window panes shatter outward/inward during lateral seismic shear waves.',
            nextZoneId: 'classroom',
            hazardDelta: 25,
          },
        ],
      },
      {
        id: 'eq-s2',
        phaseTitle: 'Phase 2: Shaking Stops — Utility & Exit Route',
        prompt:
          'Shaking pauses after 35 seconds. You smell faint LPG gas from the adjacent Chemistry Lab and see the elevator indicator still lit. How do you evacuate?',
        timeLimitSec: 20,
        activeHazardLabel: 'AFTERSHOCK RISK · GAS ODOUR DETECTED',
        choices: [
          {
            id: 'eq-s2-a',
            label: 'Shut off main lab gas valve & MCB, leave bags behind, guide single-file via Fire Stairwell A',
            isOptimal: true,
            points: 20,
            feedback:
              'Optimal response [NDMA-EQ-02]. Isolating gas/power prevents post-quake fires, and leaving backpacks keeps corridors unobstructed.',
            nextZoneId: 'stairwell',
            hazardDelta: -15,
          },
          {
            id: 'eq-s2-b',
            label: 'Use the campus elevator to move students down faster',
            isOptimal: false,
            points: 0,
            feedback:
              'Never use lifts after an earthquake—power failure or shaft misalignment traps occupants inside.',
            nextZoneId: 'elevator',
            hazardDelta: 30,
          },
          {
            id: 'eq-s2-c',
            label: 'Allow students to pack laptops and bags before walking out slowly',
            isOptimal: false,
            points: 8,
            feedback:
              'Delayed evacuation increases exposure to dangerous aftershocks and clogs narrow staircases.',
            nextZoneId: 'corridor',
            hazardDelta: 15,
          },
        ],
      },
      {
        id: 'eq-s3',
        phaseTitle: 'Phase 3: Stairwell Injury Triage',
        prompt:
          'At the stairwell landing, a student slips and suffers a deep cut on the forearm with steady bleeding (no bone deformity). What do you use first?',
        timeLimitSec: 20,
        activeHazardLabel: 'ACTIVE BLEEDING TRIAGE · EVACUATION IN PROGRESS',
        choices: [
          {
            id: 'eq-s3-a',
            label: 'Apply firm direct pressure with sterile gauze (or clean folded cotton cloth) and escort out',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct trauma care [FIRSTAID-MAJOR-01]. Direct pressure controls bleeding immediately without delaying stairwell flow.',
            nextZoneId: 'stairwell',
            hazardDelta: -10,
          },
          {
            id: 'eq-s3-b',
            label: 'Apply chalk dust or ink on the wound to stop blood quickly',
            isOptimal: false,
            points: 0,
            feedback:
              'Dangerous contamination. Chalk, turmeric, or ink causes severe wound infection.',
            nextZoneId: 'stairwell',
            hazardDelta: 20,
          },
          {
            id: 'eq-s3-c',
            label: 'Stop the entire class on the stairwell for 10 minutes to wash the arm',
            isOptimal: false,
            points: 5,
            feedback:
              'Blocking a stairwell during post-quake evacuation risks an aftershock crush hazard; compress and move to Assembly Zone first.',
            nextZoneId: 'stairwell',
            hazardDelta: 15,
          },
        ],
      },
      {
        id: 'eq-s4',
        phaseTitle: 'Phase 4: Assembly Zone & Headcount',
        prompt:
          'Your class reaches the courtyard. Where should students line up, and what is your final verification step?',
        timeLimitSec: 20,
        activeHazardLabel: 'ASSEMBLY VERIFICATION · POST-QUAKE',
        choices: [
          {
            id: 'eq-s4-a',
            label: 'Move 15m clear of buildings/power lines into Assembly Zone B and complete roll-call headcount',
            isOptimal: true,
            points: 20,
            feedback:
              'Exemplary completion [NDMA-EQ-02]. Open-ground clearance protects against falling parapets and enables immediate missing-person alerts.',
            nextZoneId: 'assembly',
            hazardDelta: -20,
          },
          {
            id: 'eq-s4-b',
            label: 'Wait directly beside the brick boundary wall for shade',
            isOptimal: false,
            points: 2,
            feedback:
              'Boundary walls frequently collapse during aftershocks—always stay in open courtyard centers.',
            nextZoneId: 'corridor',
            hazardDelta: 20,
          },
          {
            id: 'eq-s4-c',
            label: 'Dismiss students home immediately without taking attendance',
            isOptimal: false,
            points: 4,
            feedback:
              'Without attendance roll call, trapped or injured students inside classrooms go unreported.',
            nextZoneId: 'assembly',
            hazardDelta: 15,
          },
        ],
      },
    ],
  },
  {
    id: 'drill-fire',
    hazard: 'Fire',
    title: 'Lab Short-Circuit & Smoke Evacuation Drill',
    location: 'Science Wing — Lab 102 & Corridor',
    difficulty: 'Critical',
    summary:
      'Respond to an electrical short-circuit fire in a college computer/chemistry lab, apply PASS extinguisher discipline, crawl under toxic smoke, and handle a minor scald/burn.',
    ndmaRef: 'NBC India Part IV — Fire & Life Safety',
    initialZoneId: 'chemlab',
    zones: [
      { id: 'chemlab', label: 'Science Lab 102', x: 32, y: 34, w: 220, h: 150, kind: 'room' },
      { id: 'classroom', label: 'Adjacent Lecture Hall', x: 274, y: 34, w: 180, h: 150, kind: 'room' },
      { id: 'corridor', label: 'Smoke-Filled Corridor', x: 32, y: 204, w: 422, h: 66, kind: 'corridor' },
      { id: 'stairwell', label: 'East Fire Exit', x: 476, y: 34, w: 112, h: 236, kind: 'stairwell' },
      { id: 'elevator', label: 'Main Lift (Locked)', x: 32, y: 292, w: 140, h: 78, kind: 'utility' },
      { id: 'assembly', label: 'Safe Assembly Lawn', x: 204, y: 292, w: 384, h: 78, kind: 'assembly' },
    ],
    steps: [
      {
        id: 'fr-s1',
        phaseTitle: 'Phase 1: Electrical Spark & Ignition',
        prompt:
          'An inverter rack in Science Lab 102 sparks and ignites nearby cardboard manuals. A red CO2/ABC extinguisher and a water bucket are both nearby. What do you do?',
        timeLimitSec: 20,
        activeHazardLabel: 'ACTIVE ELECTRICAL FIRE · CLASS C HAZARD',
        choices: [
          {
            id: 'fr-s1-a',
            label: 'Sound fire alarm, cut lab MCB, and aim CO2/ABC extinguisher at flame base using PASS',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct per NBC Part IV [NDMA-FIRE-02]. CO2/ABC dry powder safely starves electrical fires without conducting current.',
            nextZoneId: 'chemlab',
            hazardDelta: -15,
          },
          {
            id: 'fr-s1-b',
            label: 'Throw the water bucket onto the sparking electrical rack',
            isOptimal: false,
            points: 0,
            feedback:
              'Fatal electrocution risk! Water conducts high-voltage electricity and spreads flaming oil/solvents.',
            nextZoneId: 'chemlab',
            hazardDelta: 30,
          },
          {
            id: 'fr-s1-c',
            label: 'Open all windows wide to blow the smoke out while keeping doors open',
            isOptimal: false,
            points: 4,
            feedback:
              'Opening doors/windows feeds fresh oxygen to the fire and pulls smoke into student corridors.',
            nextZoneId: 'corridor',
            hazardDelta: 20,
          },
        ],
      },
      {
        id: 'fr-s2',
        phaseTitle: 'Phase 2: Closed Door & Smoke Corridor',
        prompt:
          'Smoke thickens in the corridor outside. You reach a closed fire door leading toward the East Stairwell. How do you proceed?',
        timeLimitSec: 20,
        activeHazardLabel: 'DENSE TOXIC SMOKE · VISIBILITY LOW',
        choices: [
          {
            id: 'fr-s2-a',
            label: 'Touch door handle with back of hand; if cool, crawl low (30–45cm) with wet cloth over nose',
            isOptimal: true,
            points: 20,
            feedback:
              'Optimal survival technique [NDMA-FIRE-01]. Heat rises; breathable cooler air stays near the floor and a damp cloth filters particulates.',
            nextZoneId: 'corridor',
            hazardDelta: -15,
          },
          {
            id: 'fr-s2-b',
            label: 'Walk upright holding your breath and sprint straight through the upper smoke layer',
            isOptimal: false,
            points: 4,
            feedback:
              'Carbon monoxide and superheated gases collect near ceiling height and cause rapid collapse.',
            nextZoneId: 'corridor',
            hazardDelta: 25,
          },
          {
            id: 'fr-s2-c',
            label: 'Pull the handle open immediately without checking for heat behind the door',
            isOptimal: false,
            points: 2,
            feedback:
              'Opening a hot door can trigger a deadly backdraft flashover into your face.',
            nextZoneId: 'corridor',
            hazardDelta: 25,
          },
        ],
      },
      {
        id: 'fr-s3',
        phaseTitle: 'Phase 3: Burn First-Aid at Assembly Lawn',
        prompt:
          'Outside on the Safe Assembly Lawn, a lab assistant has a painful 1st-degree scald redness on their wrist. What is the correct medikit action?',
        timeLimitSec: 20,
        activeHazardLabel: 'THERMAL BURN CARE · ASSEMBLY POINT',
        choices: [
          {
            id: 'fr-s3-a',
            label: 'Cool wrist under clean running water for 15–20 mins and cover loosely with non-stick sterile gauze',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct burn protocol [FIRSTAID-MINOR-02]. Prolonged cool water stops deep heat transfer; loose non-stick gauze prevents infection.',
            nextZoneId: 'assembly',
            hazardDelta: -20,
          },
          {
            id: 'fr-s3-b',
            label: 'Rub toothpaste or ice cubes directly onto the blistered skin',
            isOptimal: false,
            points: 0,
            feedback:
              'Never apply toothpaste, butter, or ice—they trap heat, worsen tissue necrosis, and cause infection.',
            nextZoneId: 'assembly',
            hazardDelta: 20,
          },
          {
            id: 'fr-s3-c',
            label: 'Pop any forming blisters with a safety pin to release fluid',
            isOptimal: false,
            points: 2,
            feedback:
              'Blisters act as a natural sterile barrier; bursting them invites bacterial sepsis.',
            nextZoneId: 'assembly',
            hazardDelta: 15,
          },
        ],
      },
    ],
  },
  {
    id: 'drill-flood',
    hazard: 'Flood',
    title: 'Monsoon Waterlogging & Electrical Surge Drill',
    location: 'Ground Floor Library & Courtyard',
    difficulty: 'Elevated',
    summary:
      'Manage sudden monsoon flash-flooding entering ground-floor classrooms, isolate electrical mains safely, relocate medikits upstairs, and handle a floodwater snakebite/dehydration triage.',
    ndmaRef: 'NDMA Urban Flooding & Monsoon School Safety',
    initialZoneId: 'classroom',
    zones: [
      { id: 'classroom', label: 'Ground Floor Library', x: 32, y: 34, w: 220, h: 150, kind: 'room' },
      { id: 'chemlab', label: 'Main MCB Panel Room', x: 274, y: 34, w: 180, h: 150, kind: 'utility' },
      { id: 'corridor', label: 'Waterlogged Passage', x: 32, y: 204, w: 422, h: 66, kind: 'corridor' },
      { id: 'stairwell', label: 'Stairs to 2nd Floor', x: 476, y: 34, w: 112, h: 236, kind: 'stairwell' },
      { id: 'elevator', label: 'Campus Gate Drain', x: 32, y: 292, w: 140, h: 78, kind: 'utility' },
      { id: 'assembly', label: '2nd Floor Safe Terrace', x: 204, y: 292, w: 384, h: 78, kind: 'assembly' },
    ],
    steps: [
      {
        id: 'fl-s1',
        phaseTitle: 'Phase 1: Rising Water & Electrical Mains',
        prompt:
          'Cloudburst rain floods the ground-floor library to ankle height (10 cm) and water is creeping toward wall power sockets. What must happen first?',
        timeLimitSec: 20,
        activeHazardLabel: 'RISING FLOODWATER · ELECTROCUTION RISK',
        choices: [
          {
            id: 'fl-s1-a',
            label: 'Have dry-footwear staff isolate main MCB breaker before water touches sockets and move upstairs',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct per NDMA Flood SOP [NDMA-FLOOD-01]. Shutting mains early prevents lethal water-borne electrocution.',
            nextZoneId: 'chemlab',
            hazardDelta: -15,
          },
          {
            id: 'fl-s1-b',
            label: 'Unplug library computers while standing barefoot in the ankle-deep water',
            isOptimal: false,
            points: 0,
            feedback:
              'Extreme electrocution hazard! Never touch live plugs or metal racks while standing in water.',
            nextZoneId: 'classroom',
            hazardDelta: 30,
          },
          {
            id: 'fl-s1-c',
            label: 'Send students outside through the knee-deep moving gate drain to go home',
            isOptimal: false,
            points: 2,
            feedback:
              'Moving water over 15 cm knocks pedestrians off balance and hides open manholes and downed cables.',
            nextZoneId: 'elevator',
            hazardDelta: 25,
          },
        ],
      },
      {
        id: 'fl-s2',
        phaseTitle: 'Phase 2: Vertical Evacuation & Supplies',
        prompt:
          'Students are ascending to the 2nd Floor Safe Terrace. Which critical campus kit items must staff carry upstairs?',
        timeLimitSec: 20,
        activeHazardLabel: 'VERTICAL SHELTERING · MONSOON ISOLATION',
        choices: [
          {
            id: 'fl-s2-a',
            label: 'Medikit box, ORS packets, chlorine water tablets, LED torch, whistle, and attendance register',
            isOptimal: true,
            points: 20,
            feedback:
              'Optimal sheltering checklist [NDMA-FLOOD-01]. Safe hydration, trauma supplies, and roll-call lists keep students safe until SDRF clearance.',
            nextZoneId: 'stairwell',
            hazardDelta: -15,
          },
          {
            id: 'fl-s2-b',
            label: 'Leave the first-aid kit behind to carry library desktop monitors upstairs',
            isOptimal: false,
            points: 4,
            feedback:
              'Human health and emergency hydration take absolute priority over replaceable electronics.',
            nextZoneId: 'stairwell',
            hazardDelta: 15,
          },
          {
            id: 'fl-s2-c',
            label: 'Allow students to drink untreated rainwater from open roof tanks',
            isOptimal: false,
            points: 2,
            feedback:
              'Untreated flood/runoff water causes acute gastroenteritis and leptospirosis.',
            nextZoneId: 'assembly',
            hazardDelta: 20,
          },
        ],
      },
      {
        id: 'fl-s3',
        phaseTitle: 'Phase 3: Floodwater Snakebite Triage',
        prompt:
          'A gardener sheltering on the terrace was bitten on the calf by a displaced snake near the stairwell. What is the ONLY safe first-aid action?',
        timeLimitSec: 20,
        activeHazardLabel: 'VENOMOUS BITE SUSPECTED · CALL 108',
        choices: [
          {
            id: 'fl-s3-a',
            label: 'Keep victim calm and still, immobilize leg below heart level with loose splint, and call 108',
            isOptimal: true,
            points: 20,
            feedback:
              'Correct Red Cross snakebite SOP [NDMA-FLOOD-02]. Immobilization slows lymphatic venom spread until hospital anti-venom.',
            nextZoneId: 'assembly',
            hazardDelta: -20,
          },
          {
            id: 'fl-s3-b',
            label: 'Cut an X over the fang marks with a blade and try to suck out the venom',
            isOptimal: false,
            points: 0,
            feedback:
              'Dangerous myth! Cutting increases bleeding/infection and sucking venom endangers the rescuer.',
            nextZoneId: 'assembly',
            hazardDelta: 25,
          },
          {
            id: 'fl-s3-c',
            label: 'Tie a rope tightly like a tourniquet above the knee to stop blood completely',
            isOptimal: false,
            points: 2,
            feedback:
              'Tight arterial tourniquets cause tissue death (gangrene) and worsen local venom damage.',
            nextZoneId: 'assembly',
            hazardDelta: 20,
          },
        ],
      },
    ],
  },
];
