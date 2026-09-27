# Study: SoC bodies — proportions, heads, poses (Pixel Walker reference)

- **source**: owner's extracted Sword of Convallaria sprites `C:\Users\never\48bit\SoC_units\<unit>\frames\*_idle_0 | *_wait_0.png`
  (13 units: base mannequin, male/female player bases, elder, old knight, stocky boss, berserker, hunched majin,
  princess, beast-folk lion, hatted npc, chibi creature) · studied: 2026-09-26 · **study only — © XD Inc., never copy pixels**
- **true size**: frames are cropped tight (no fixed cell). Humanoids 22–34 w × 44–50 h; hats/crowns reach 56;
  "large units" (armoured knight 47×60, beast colonel 61×62, mecha 53×56); chibi creature 28×31
- **colors**: 19 (bare player base) → 30–59 dressed (median ~34) · **palette saved as**: not saved
- Companion cards: 007 (project standard, wins on sizes/workflow), 009 (costume design language)

## Measurements
- Height barely varies between humanoids (44–50). Character comes from **width, stance and head mass**, not height.
- Head (hair top → chin) ≈ **42 %** of height (player base: 21 of 50 rows). Hair mass sticks out 2–4 px past the skull
  on top/back; hats add 6–10 px; crowns/feathers/horns add more.
- Silhouette outline black on **98–100 %** of edge pixels in every unit; interior lines are never black.
- Bare player base: skin ramp 12 steps V0.11→0.91 hue 40→32 (warm); loincloth greys V0.73→1.0 shading toward violet.

## Observations (pixel level, from 8× zooms)
- **Face**: sits in the lower half of the head, shifted to the facing side (right). Near eye = 2 px white + 1 px dark
  iris column under a dark lash row; far eye ~2 px; no nose, no mouth at rest. Hair frames the face on the back side
  and falls to the jaw line. Eye colour is a deliberate small accent (teal/blue/red).
- **Hair**: a big chunky mass in 4–6 tones, clusters follow strand direction, top-front lit, back and underside dark.
  It is the largest single shape on most characters.
- **Torso** is narrow (8–10 px); arms 2–3 px thick; hands small skin blobs; legs slightly apart even at rest; feet
  point to the facing side. Far arm/leg one step darker along their whole length.
- **Skin**: lit front, shadow on the back side of each limb and under the head; 5–6 visible tones on a dressed unit.
- **Idle pose = personality**: fighters crouch with a wide stance and bent knees (berserker, bandit), nobles stand
  upright with hands together (princess), elders hunch forward with a wide base (craftsman), beast-folk lean forward
  with a huge head/mane and hanging claws, knights stand tall and narrow. The pose is drawn into the body, not only the outfit.
- **Body types** are separate bodies, not the same mannequin stretched: stocky = wider shoulders + shorter legs
  (29 wide, 44 tall), tall-thin = narrow and long-legged (22 × 49), female base = same height, narrower waist, softer outline.

## Rules to apply (imperative)
- Keep humanoids 44–50 px tall on the 48×64 cell (feet at 24,58). Differentiate characters by **stance, width, head
  mass and a headpiece**, not by height. Reserve bigger cells only for deliberate "large units" (bosses, beasts, mechs).
- Head ≈ 40–43 % of height. Build the head as: skull → big hair mass (2–4 px over) → face low and forward → 2-px
  eye whites + 1-px iris + dark lash row. No nose/mouth unless the frame is an expression/action.
- Give every character an idle pose that says who they are (crouch/stance for fighters, upright for nobles, hunch for
  elders/monsters). Feet stay planted; the pose lives in knees, shoulders and head tilt.
- Shade the body like a cylinder lit from top-front: lit centre, dark back edge, dark underside (under chin, arms, hem).
  Far limbs one step darker. Silhouette black; limb-over-body edges black on both sides only in action poses (card 007).
- For our player characters the body is the avatar-pack base (card 007). Use these observations when drawing **our own
  replacement base** and NPC/monster humanoids — new designs, same technique.

## Do NOT copy
- Any SoC face, hairstyle, costume, crest or silhouette as a design. Study the method; design our own
  (Thai city people for the pixel layer, Lanna for the myth layer — docs/STORY.md).
- The SoC base/hair pixels in the avatar pack are temporary placeholders: never build new art on top of them for release.
