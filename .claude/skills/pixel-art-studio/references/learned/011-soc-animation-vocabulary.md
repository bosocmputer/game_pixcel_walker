# Study: SoC animation vocabulary — few reusable actions, split into short frame runs

- **source**: owner's extracted Sword of Convallaria frames `C:\Users\never\48bit\SoC_units\<unit>\frames\<unit>_<anim>_<i>.png`
  (219 units counted; banditCrossbowM2, MonsterBoarMset01 and the base mannequin HcheckboardMset01 viewed frame by frame)
  · studied: 2026-09-27 · **study only — © XD Inc.**
- **true size**: per-frame cropped sprites (no fixed cell) · **colors**: n/a · **palette saved as**: not saved
- Read with 007 (project standard); the owner spotted this pattern first ("แต่ละตัวมีท่าใช้งานไม่กี่ท่า").

## Measurements (219 units: anim → units that have it, frames min/median/max)
- **Battle set**: `idle` 158 (1/8/23) · `injured` 137 (1/2/2) · `attack` 115 (4/10/26) · `walk` 101 (6/8/16) ·
  `injured2` 59 · `crouch` 58 (2) · `injuredall` 56 (16) · `attack2` 54 · `jumpUp` 52 (2) · `throw` 51 (4) ·
  `cast` 50 (6) · `cheer` 52 · `attack3` 23 · `Exskill` 13
- **Out-of-battle set**: `wait` 98 (1/6/14) · `move` 83 (2/8/12) · `plot1..10` (story poses) · `shake`, `anime*`
- By kind: **monsters** = idle · injured · attack · walk (+ attack2 / anime for specials). **NPCs** = wait · move · plot
  only (no combat). **Heroes/soldiers** = the full battle set + wait/move.
- **Every multi-frame action holds two facings**: first half = front 3/4 (facing right), second half = back 3/4.
  idle 8 = 4 + 4, attack 10 = 5 + 5, walk 8 = 4 + 4, injured 2 = 1 + 1, crouch 2 = 1 + 1.

## Observations
- `wait` (relaxed standing, arms down) and `idle` (combat-ready: knees bent, wide feet, arms up/out, body lowered)
  are different animations. Same for `move` (relaxed walk) vs `walk` (combat walk, crouched, arm forward).
  A unit standing in battle plays `idle`, never `wait` — that is why it never looks stiff.
- `idle` front half = 4 frames of breathing: the upper body bobs ~1 px and the arms shift a pixel; feet stay planted.
- `attack` front half = 5 frames: anticipation crouch → wind-up → strike (contact) → follow-through → recover.
- `injured` = ONE frame per facing (lean back, arms flung, head snapped) — the "hurt" moment is a single held pose,
  sold by timing, flash and knock-back, not by many frames.
- Monster (boar): the same four actions; attack = crouch → rear up → head-butt → back down.
- The base mannequin HcheckboardMset01 has only wait · move · run · crouch · injured · injured2 · throw · jumpUp · cheer —
  **no combat idle and no attack**. `crouch_0` works as a ready stance, `injured_0` as the flinch.

## Rules to apply (imperative)
- Give every fighter the small battle set: **stance/idle (2–4 f) · attack (3–5 f) · hurt (1 f)**, optional walk/cast.
  Monsters: idle · attack · hurt (+ walk). Keep relaxed `wait/move` for the map, combat `idle` for fights.
- Pixel Walker battles are side-on (heroes left facing right, monsters mirrored) → draw only the **front 3/4 half**.
- Breathing idle: move only the upper body ~1 px between frames; never move the feet.
- Hurt: one strong single pose held ~250 ms + white flash + knock-back (the engine already does flash/knock-back).
- New player poses are built on the base in `48bit\study\pose_*.py` with the head swapped for wait_0's head
  (`pose_slash.swap_head`), so every hairstyle's wait_0 hair fits the new frame.

## Do NOT copy
- Any SoC frame or pose pixel-for-pixel; the vocabulary and timing are the lesson, the drawings must be ours
  (the mannequin itself is a temporary placeholder).
