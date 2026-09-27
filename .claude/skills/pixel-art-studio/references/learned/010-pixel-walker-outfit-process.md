# Study: how an outfit layer passes the owner's review (Pixel Walker, process lessons)

- **source**: three owner reviews of outfit key frames on the base body `wait_0`, 2026-09-26 —
  A03 v1 (procedural, rejected), A03 v2 (hand-pixelled, "almost, several flaws"), B01 tee + jeans (approved: "เยี่ยมมาก")
- **true size**: 48×64 cell, feet (24, 58) · **colors**: the approved B01 layer uses 14 · **palette saved as**: in `pixel-art/outfit-b01-basic/build.py`
- Read with 007 (standard), 008 (bodies), 009 (costume language)

## What failed and why
- **Procedural painting** (colour the body-part map, shade from the mannequin's grey classes) → flat colour blocks,
  bands instead of planes, no garment shapes. Rejected outright.
- **Too much at once** (vest + jacket + scarf + bib + reflective band) before the basics were right → muddy mid-torso,
  scattered 1-px shadows, stiff rectangular arms, a hard collar band, stump hands.
- **Wrong facing**: the base faces RIGHT. Read it from the eyes: near eye = 2 px white (x23-24), far eye = 1 px at the
  face's right edge (x29). The big left arm is the NEAR arm in front of the torso; the chest front sits right of centre under the chin.

## What passed (B01)
- Every pixel written by hand as rows of material indices (`(row, first_x, "3344…")`), against an ASCII dump of the
  body frame (`#` outline, `o` skin base, `s` skin shade, `h` hair) so each pixel lands on purpose.
- Plain garment first: 3–5 steps per material in **large clean clusters** — one lit block on the shoulders/upper chest,
  a mid body, dark sides and bottom, one diagonal crease, a dark hem row. Like SoC villager shirts (npc55/60/36).
- Crew-neck rib (1-2-2-2-1) dipping at the front, sleeve 1 px wider than the arm with a dark hem row, armpit inner line.
- Jeans: waistband, fly/crotch seam, lit thigh column + lit knee on the near leg, far leg one step darker, rolled hem band.
- White = cool blue-lavender shadows → warm white (contrasts with warm skin). Same pixels in a second colour (mustard)
  to prove the structure reads without the colour.
- Black silhouette added automatically **one pixel outside** every garment pixel that touches empty space → clothes are
  1 px thicker than the body everywhere.
- A script check for lone pixels (no same-colour neighbour incl. diagonals) → fix every hit before sending.

## Rules to apply (imperative)
- Never paint an outfit procedurally. Hand-place rows of pixels against the ASCII body dump.
- Confirm facing from the eyes before placing anything front/back-dependent.
- Build new outfits **on top of an approved basic** (B01 structure): get plain shirt/trousers/shoes right, then add one
  signature piece and one flowing piece at a time, each reviewed.
- Keep the layer lean (≈14–25 colours); big clusters; one or two creases; run the lone-pixel check; send a review sheet
  (10× zoom + grid, 3× and 1× beside the bare base, frame number on the image).

## Do NOT copy
- The SoC villagers' actual shirts, crests or colour sets — only the cluster/plane method.
