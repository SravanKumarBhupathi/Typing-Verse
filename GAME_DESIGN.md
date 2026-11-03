# TYPEVERSE — Game Design & Telemetry Specification

## Core Design Principle

**Every game in TYPEVERSE is driven by real typing performance.** Higher Net WPM, higher accuracy, longer word complexity, and unbroken combo streaks directly translate into in-game velocity, attack damage, shield regeneration, and score multipliers.

## The Six Games

### 1. Meteor Defender (Space Arcade Survival)
- **Mechanic**: Descending meteors carry words; locking onto a word fires orbital plasma lasers.
- **Typing Coupling**: Faster WPM increases weapon fire cadence; combo streaks amplify score multipliers; every 8th cleared target spawns an armored Boss Meteor with a multi-word sequence.

### 2. Type Racer GT (Circuit Racing)
- **Mechanic**: 4-lane sprint to the 1,000-meter finish line against 3 rival cruisers.
- **Typing Coupling**: Each accurate keystroke propels your vehicle forward (`5.2m + combo bonus`); typos reset your acceleration combo and allow rivals to close the gap.

### 3. Spell Caster (Fantasy Arcane Combat)
- **Mechanic**: Elemental enemies and Boss Dragons channel dark barriers with countdown rings.
- **Typing Coupling**: Typing incantations casts elemental spells; word length determines base spell damage, and high combos restore Archmage Mana.

### 4. Word Defender (Tactical Tower Defense)
- **Mechanic**: Hostile mechanized units advance across Top, Center, and Bottom lanes toward your Citadel wall.
- **Typing Coupling**: Typing any unit's word fires rail-turrets down that specific lane before the unit breaches the perimeter (`x <= 85px`).

### 5. Cyber Duel (1v1 Competitive Combat)
- **Mechanic**: Direct head-to-head combat where the rival deals continuous DPS based on difficulty tier (`1.8` to `5.4 HP/sec`).
- **Typing Coupling**: Accurate characters deal immediate counter-damage (`1.15 + combo bonus`) and fire kinetic beams on every completed word.

### 6. Word Survival (Countdown Endurance Arcade)
- **Mechanic**: Volatile word nodes spawn across the containment grid with individual countdown fuses (`4.5s–8.5s`).
- **Typing Coupling**: Players must prioritize and defuse nodes with the lowest remaining fuse time before detonation.
