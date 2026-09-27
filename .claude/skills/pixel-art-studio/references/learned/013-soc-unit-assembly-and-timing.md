# Study: how SoC assembles a battle unit (layers, weapon cut, clip timing) + sword idle stances

- **source**: the owner's Steam install `C:\Program Files (x86)\Steam\steamapps\common\Sword of Convallaria\assets\battle\unit`
  (UnityPy, read-only; same data as the launcher install). AnimationClips `banditGuardianM_*_RF`, sword idles of
  banditGuardianM, darklightGuradianM, crimsonAssassinM4set01, HplayerMercenarygirlF2set01, HiriaPrincessguardF2set01,
  HknightsPaladinF2set01 · studied: 2026-09-27 · **study only — © XD Inc.**
- Read with 011 (action set) and 012 (anatomy).

## Measurements
- A unit prefab = the body SpriteRenderer + child renderers for the weapon (and shield). The children sit at z −0.01 and
  −0.02, so the **weapon is drawn in front of the body**. Clips only swap sprites (a PPtr curve) at 30 fps. There is
  no position or rotation animation: every bob and swing is drawn into the frames.
- One clip per facing: `_RF` `_LF` `_RB` `_LB` (right/left × front/back). Left is not always a mirror.
- Timing, banditGuardianM (frames @30 fps):

  | action | frames held | total |
  |---|---|---|
  | idle | 4 / 5 / 4 / 5 (≈133–167 ms each) | loop ≈ 630 ms |
  | walk | 4 × 4 (133 ms) | 533 ms |
  | attack | 3 (anticipation) · **15 (wind-up held 500 ms)** · 2 (strike 67 ms) · 3 (follow-through) · 7 (recover) | ≈ 1 s |
  | injured | one pose held | 600 ms |
- **The weapon layer is cut where the fist wraps it.** The fist pixels are in the body layer; the weapon sprite leaves a
  gap there, so the grip shows on both sides of the hand.
- **Most unit sprites are in `assets/share/tex`, not `battle/unit`** (found 2026-09-27). That includes heroes, the player
  units PlayerM/Fset01, monsters and NPCs, plus their weapon and prop layers. Palettes can sit in any bundle.
  Extracted with `48bit/study/extract_share_tex.py` → `SoC_units` (656), `SoC_weapons` (333 layers), `SoC_effects`
  (186 fx). New folders carry `pivots.json`. Contact sheet of the 37 male sword units: `study/sword_lineup.py idle 0 M`
  → `48bit/SoC_study_sheets/`.

## Observations: sword idles
- All are **compact crouches**: knees deeply bent, wide A-shaped stance, head right on the shoulders (no neck), total
  height ≈ 36–40 px against 45 px standing. The torso is small and partly hidden by the arms.
- Four guard types seen:
  1. **High guard** (bandit): near fist in front of the chest, blade up-forward.
  2. **Back hand** (darklight): the sword arm stretched back-low, blade pointing back, the off hand forward.
  3. **Low guard** (princessguard, paladin): hand at the hip, blade angled down-forward to the ground.
  4. **Reverse grip** (assassin): dagger reversed in a crouch.
- **Limbs leave the torso** in 2 and 3, and with the off hand. Arms and weapon stick out of the silhouette instead of
  lying over the chest, which keeps the shape readable at 1×.
- Breathing loop: the body bobs 1 px; the weapon moves 1 px and sometimes tilts one step. The feet never move.

- **Owner's choice (2026-09-27)**: our player sword idle uses type 2 (back hand). Types 1, 3 and 4 are kept for
  other classes later. Skeleton: `48bit/study/stance_skeleton.py backhand`.

## Rules to apply (imperative)
- Keep the weapon as its own layer in front of the body and cut it where the fist closes (or use our hand layer over
  it — same result).
- Time idles at about 150 ms per frame. Hold the attack wind-up about 500 ms, snap the strike in about 70 ms, recover
  in about 230 ms.
- Build a combat idle as a compact crouch. Get the weapon and at least one arm OUT of the torso silhouette. Choose a
  guard that keeps the blade clear of the big chibi head: low guard or back hand. A high guard only works if the blade
  passes in front of the face.

## Do NOT copy
- SoC pixels, frames or exact poses. The layer and timing facts and the kinds of guard are the lesson.
