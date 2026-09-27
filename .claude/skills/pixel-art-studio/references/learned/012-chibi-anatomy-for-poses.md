# Study: chibi anatomy for new poses — neck, shoulders, arm lengths (48×64 base)

- **source**: part maps of our base mannequin frames (wait_0, wait_8, move_0, move_2, crouch_0, run_0, injured_0 via
  `48bit/study/pose_slash.base_cell`) + owner's extracted SoC sword idles (banditGuardianM, HknightsPaladinF2set01)
  · studied: 2026-09-27 · **study only — © XD Inc.**
- **why**: the owner rejected the first sword guard with "คอยื่น" (the neck juts forward). Cause: the far arm was left
  hanging under the chin in front of the throat, and the chest sat behind it. Read this before drawing any new pose.
- Read with 007 (standard), 010 (hand-pixel process) and 011 (action set).

## APPROVED skeleton (owner, 2026-09-27) — use these bones, not the part-map rows below
`48bit/study/tpose.py` (front T-pose and arms down) → `48bit/base/anatomy/tpose.png`. `tpose34.py` makes the game view
(3/4 facing right, 30° turn; it fits the base body wait_0) → `tpose34.png`.
- head top y17, chin 31 · neck 2 (neck base y33) · shoulder joints y35, 12 apart (≈ head width) · spine 13 to the pelvis
  y46 · hip joints y47, 6 apart
- **upper arm 4.5 = forearm 4.5**, hand 2.5 · thigh 4.5 = shin 4.5, foot 2.5 (the owner rejected an upper arm of 6: too long)
- arms down: elbow at the waist (y39.5), wrist y44, fingertips at the crotch (y47) · knee y51.5, ankle y56, sole y58
- 3/4 right view: widths across the body × cos30 ≈ 0.87; the near limbs are on the screen LEFT.
- Workflow: pose the skeleton as lines first (same bone lengths), get it approved, and only then pixel the pose.

## Measurements (rows in the 48×64 cell, feet at y 58). Part-map extents: they include the shoulder cap and edges, so they are NOT bone lengths
| part | standing (wait/move) | crouched (crouch_0) |
|---|---|---|
| head (face, no hair) | 15–16 rows, 12–13 wide | 10 rows visible (tilted forward) |
| neck | **1 row, 5–6 px wide**, straight under the back half of the head | 1 row (reads as the jaw's shadow) |
| torso | 10–12 rows, 9–11 wide | 8–9 rows |
| hip | 4 rows | 4 rows |
| upper arm | 6–8 rows, 3–4 wide; starts 1–2 rows below the neck | — |
| forearm | 4–5 | — |
| hand / fist | 3–4 (hanging hand reaches the bottom of the hip) | — |
| legs (thigh+shin+foot) | ~12 rows | ~10 rows |
- The full arm (upper + forearm + hand ≈ 14–16 px) is as long as torso + hip.
- SoC sword idles: **no neck is visible at all**. The chin sits on the shoulder line, the chest front is 1–2 px behind
  the chin, and the weapon hand is in front of the chest or belly.

## Rules to apply (imperative)
- The neck is at most 1 row, 5–6 px wide, under the back half of the head. Never let anything skin-coloured hang
  under the chin ahead of the chest: it reads as a throat jutting forward.
- In a stance, bring the chest top right up under the jaw and paint that first chest row as skin shadow (the head's
  cast shadow). This is the only separation between the head and the chest.
- The chest front is 1–2 px behind the face front. A chest level with the face looks barrel-chested.
- The shoulder joint sits at the top-back of the chest. The shoulder cap is 4 px wide and narrows to a 3 px upper arm.
  **The top of the cap is level with the top of the back**, just under the back of the head. A cap drawn 2–3 rows lower
  leaves a hump of back above it and a black line across the chest; the owner flagged it as "ไหล่ไม่ตรง".
- A hand held in front of the belly needs a **bent elbow**. The upper arm hangs down to the waist, then the forearm
  comes forward into the fist. Draw the inner crook of the elbow as an L of outline, with chest showing above the
  forearm. A straight limb from the shoulder to the belly is shorter than a real arm and reads as a stick.
- Keep the approved bone lengths (upper arm 4.5, forearm 4.5, hand 2.5). Check each new pose as a skeleton over the stance first.
- Knees bend FORWARD, toward the facing side (screen right). The knee point sits on the line from hip to ankle or
  in front of it, never behind it. Toes point forward (right). The owner caught a rear knee placed behind the line,
  which read as the foot going the wrong way (2026-09-27).
- New poses are copied point by point from a reference frame: place the reference in our cell (feet pivot → (24,58)),
  read the joints, put our base head where its eyes meet the reference's eyes, then pixel over those points.
  Camera note: SoC looks down at the ground, so a foot further forward/nearer sits lower on screen.
- Straight things must be pixel-straight (the owner called these "เบี้ยว" twice). A limb or blade edge is either
  perfectly flat/vertical or follows ONE regular step pattern (1:1, 1:2, 1:3 …). Never leave a single stray
  1-px step in the middle of a blade or an arm edge. Check with an ASCII dump, row by row.
  - The weapon axis runs through the centre rows of the fist and continues the forearm's axis. A grip on the fist's
    bottom row makes the sword look bent off the arm.
  - The fist sits on the arm's axis. It may be 1 row taller than the forearm on the knuckle side, never hanging
    below it.
  - Don't outline a grip that is inside the fist (it leaves a black line at the wrist). Remove leftover seams where
    an erased limb used to be.
- 3/4 view facing right: the far arm is mostly hidden behind the chest. Only show its hand/forearm beyond the chest
  front, never under the chin. When unsure, hide it.
- Before sending, check the part-labelled ASCII of the new frame: head → 1 neck row → chest → hip, with no gaps and no
  stray limb pieces.

## Do NOT copy
- SoC pixels or poses; measure proportions only.
