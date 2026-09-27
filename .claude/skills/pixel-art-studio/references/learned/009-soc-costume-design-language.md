# Study: SoC costume design language — silhouettes, faction colour, layering, materials

- **source**: owner's extracted Sword of Convallaria sprites `C:\Users\never\48bit\SoC_units\<unit>\frames\*_idle_0.png`
  (16 costumes: bandit guardian/crossbow, knights lancer, paladin, dark knight, crimson priest & assassin, papal bishop,
  darklight wizard, military crossbow, beast colonel, police priest & twins, mecha, doctor, lady president) + the owner's
  earlier 20-character costume study (`48bit\reference\costume_techniques.md`) · studied: 2026-09-26 · **study only — © XD Inc.**
- **true size**: 23–36 w × 44–56 h (large units up to 61×62) · **colors**: 21–52 per unit · **palette saved as**: not saved
- Companion cards: 007 (project standard), 008 (bodies)

## Measurements
- Outline black 98–100 % of silhouette pixels; inner lines 0 % black (costume_techniques.md).
- Costume sticks out past the body 1.5 px per side on average (max 4); hems flare 1–4 px; long robes/dresses cover the legs 8–12 rows.
- Per material 3–9 steps (typ. 5–8), V ≈ 0.14 → 0.93, hue shift ≈ 27° dark→light.
- Material ramps seen (dark → light):
  - **white armour/dress** (paladin): ~10–17 greys V0.22→1.0 — shadows **lavender/blue-grey** (H≈255), lights **warm cream** (H≈40). "White" is never neutral grey.
  - **dark coat** (police priest, dark knight): plum/navy greys V0.13→0.6 — interiors never pure black (black is outline only).
  - **gold/brass**: 8 steps V0.29→1.0, olive-brown shadow → pale cream highlight (H≈52).
  - **blue cloth**: 8 steps V0.50→0.94 H231→216 · **red/crimson**: 10–14 steps V0.2→0.9 H350→15 (shadow toward purple-red).
  - **olive/khaki** (bandit helmet, military): 6 steps V0.21→0.50 H≈51 — deliberately low value, earthy.
  - **leather/brown**: 14–17 steps V0.12→0.86 H≈20–30.

## Observations — the design language
- **One signature silhouette piece per costume**, almost always at the head or shoulders: olive helmet with brim,
  crested/plumed helm, horned helm, tricorn, hood, mitre with veil, peaked cap, military cap, crown, feathered top hat,
  fur mane. You can name the class from the silhouette alone.
- **One flowing piece that breaks the outline**: cape, scarf tail, coat tails, layered skirt, sash, fur. The body is never a clean rectangle.
- **Faction colour = 2 dominant materials + 1 accent**:
  crimson = maroon/red + gold · papal = cream-white + gold/red trim · darklight = navy/purple/black + **glowing** magenta/red ·
  knights = blue + steel + gold · bandit/military = olive + brown leather (earthy, muted) · police = red + charcoal / white + violet.
- **Supernatural/villain marker = a small glowing accent** (red eyes, magenta crystals, purple glow) on an otherwise dark,
  low-saturation costume. The glow colour is the brightest, most saturated thing on the sprite.
- **Layering reads as depth**: armour over cloth (cloth shows at sleeves and hem), cloak over armour, scarf over collar,
  belt/pouch/strap over the torso. Each layer is 1 px "thicker" than the one under it and casts a 1-row shadow onto it.
- **Accents are tiny**: gold buckles/crests 1–3 px, eye colour 1–2 px, a single emblem. Large areas stay muted.
- **Modern clothing works in this technique** (police uniforms, suits, a mecha, a doctor, a lady president) — the same
  rules carry over to our contemporary Thai city.
- The face always stays readable: headpieces frame it, never cover the near eye.

## Rules to apply (imperative)
- Design each outfit/NPC/monster-humanoid with a checklist: (1) signature head/shoulder piece, (2) one flowing piece,
  (3) 2 dominant materials + 1 accent, (4) at least one layer overlap with its 1-row shadow, (5) a 1–3 px focal accent.
- Pick the palette by world layer (docs/STORY.md) instead of SoC factions:
  - **pixel layer (E–C, Thai city, fun)**: everyday city materials — denim, hi-vis orange vest, school white/navy,
    concrete grey, plastic colours — muted, with the **rift accent cyan #7ff0ff / magenta #ff7ae0** as the glow marker.
  - **myth layer (B–S, Lanna, solemn)**: indigo mohom, deep red, gold leaf, jade, dark stone — gold as the noble accent,
    warm gold glow for guardians.
- Whites: lavender/blue shadows → warm cream lights (8–10 steps). Darks: plum/navy greys, never pure black inside.
- Signature pieces we can use (ours, not SoC's): งอบ/straw hat, ผ้าโพกหัว, ผ้าขาวม้า scarf/sash, motorbike-taxi vest,
  school cap, vendor apron, hard hat, ม่อฮ่อม jacket, ผ้าซิ่น skirt, Lanna turban/headcloth, naga-crest, temple-guardian crown.
- Respect: no religious robes/insignia on enemies (STORY.md) — guardians are dignified, never mocked.

## Do NOT copy
- SoC faction names, crests, emblems, specific helmets/hats/costumes, or their colour pairings as a set — use the
  *principle* (2+1 palette, glow marker), with our own STORY.md-driven palettes and Thai/Lanna motifs.
- Never recolour or trace an SoC costume to make "ours".
