/** Item & skill icons (12×12) for the RO-style item window and hotkey bar. */
import { heroCanvas, shadeSprite, type Paperdoll } from './art';

type Palette = Record<string, string>;

const TPL: Record<string, string[]> = {
  potion: ['....kk......', '....ww......', '...wkkw.....', '..wccccw....', '.wcclccw....', '.wcllccw....', '.wccccccw...', '.wccccccw...', '..wccccw....', '...wwww.....', '............', '............'],
  sword: ['..........ww', '.........wlw', '........wlw.', '.......wlw..', '......wlw...', '.....wlw....', '.gg.wlw.....', '..ggw.......', '..gyg.......', '.gg.gg......', 'gg..........', '............'],
  staff: ['.........yy.', '........yccy', '........yccy', '.........yy.', '........t...', '.......t....', '......t.....', '.....t......', '....t.......', '...t........', '..t.........', '............'],
  club: ['.......ccc..', '......ccccc.', '.....ccclcc.', '.....cccccc.', '......cccc..', '.....tt.....', '....tt......', '...tt.......', '..tt........', '.tt.........', '............', '............'],
  chest: ['..cc....cc..', '.ccccccccccc', '.cccclcccccc', '..cccccccc..', '..cccccccc..', '..cccccccc..', '..cccccccc..', '..cccccccc..', '..cccccccc..', '............', '............', '............'],
  helm: ['............', '....cccc....', '...cclccc...', '..ccclcccc..', '..cccccccc..', '..cckkkkcc..', '..cc....cc..', '..cc....cc..', '............', '............', '............', '............'],
  boots: ['............', '...cc.......', '...cc.......', '...cc...cc..', '...cc...cc..', '...ccc..cc..', '..cccc..ccc.', '..cccc.cccc.', '........cccc', '............', '............', '............'],
  ring: ['............', '.....yy.....', '....yccy....', '.....yy.....', '...cc..cc...', '..c......c..', '..c......c..', '..c......c..', '...cc..cc...', '.....cc.....', '............', '............'],
  shield: ['..cccccccc..', '.cclccccccc.', '.clycccyccc.', '.ccyyyyyccc.', '.cccyyyyccc.', '.ccccyycccc.', '..cccccccc..', '..cccccccc..', '...cccccc...', '....cccc....', '.....cc.....', '............'],
  stone: ['............', '............', '...cccc.....', '..cclllcc...', '.cclcccccc..', '.cccccccccc.', '..cccccccc..', '....cccc....', '............', '............', '............', '............'],
  kit: ['............', '....kkkk....', '....k..k....', '.cccccccccc.', '.ccccyycccc.', '.cccyyyyccc.', '.ccccyycccc.', '.cccccccccc.', '.cccccccccc.', '............', '............', '............'],
  slash: ['..........w.', '.........ww.', '........ww..', '.......ww...', '......ww....', '.....ww.....', '....ww......', '...ww.......', '..ww........', '.ww.........', 'w...........', '............'],
  fire: ['.....y......', '....yy......', '....yry.....', '...yrry.y...', '..yrrrryy...', '..yrrorrry..', '.yrroooorry.', '.yrooooorry.', '.yrooyooory.', '..yroooory..', '...yrrrry...', '............'],
  bolt: ['......yyy...', '.....yyy....', '....yyy.....', '...yyyyyy...', '......yyy...', '.....yyy....', '....yyy.....', '...yyy......', '..yy........', '.y..........', '............', '............'],
  guard: ['..cccccccc..', '.cllccccccc.', '.clcccccccc.', '.cccccccccc.', '.cccccccccc.', '..cccccccc..', '..cccccccc..', '...cccccc...', '....cccc....', '.....cc.....', '............', '............'],
  heal: ['....gggg....', '....gllg....', '....gllg....', 'ggggglllgggg', 'glllllllllgg', 'glllllllllgg', 'ggggglllgggg', '....gllg....', '....gllg....', '....gggg....', '............', '............'],
  arrow: ['..........yy', '.........yyy', '........ww..', '.......ww...', '......ww....', '.....ww.....', '....ww......', '...ww.......', 'bbww........', 'bbw.........', '.b..........', '............'],
  poison: ['.....g......', '....ggg.....', '....ggg.....', '...ggggg....', '..gglgggg...', '..glggggg...', '..ggggggg...', '...ggggg....', '....ggg.....', '............', '............', '............'],
  shadow: ['....kkkk....', '...kkkkkk...', '..kkwkkwkk..', '..kkkkkkkk..', '...kkkkkk...', '..k.kkkk.k..', '.k..kkkk..k.', '....k..k....', '...k....k...', '............', '............', '............'],
  run: ['.....ss.....', '.....ss.....', '...cccc.....', '..c.cccc....', '....ccc.c...', '....ppp.....', '...pp.pp....', '..pp...pp...', '.bb.....bb..', '............', '............', '............'],
  flee: ['............', '.....w......', '....ww......', '...wwwwwwww.', '..wwwwwwwww.', '...wwwwwwww.', '....ww......', '.....w......', '............', '............', '............', '............'],
};

const ITEM: Record<string, { tpl: string; pal: Palette }> = {
  red_potion: { tpl: 'potion', pal: { k: '#8a5a3a', w: '#e8f4ff', c: '#e53935', l: '#ff8a80' } },
  blue_elixir: { tpl: 'potion', pal: { k: '#8a5a3a', w: '#e8f4ff', c: '#1e88e5', l: '#90caf9' } },
  whetstone: { tpl: 'stone', pal: { c: '#8d8f9a', l: '#c8cad4' } },
  master_repair_kit: { tpl: 'kit', pal: { k: '#555555', c: '#d84315', y: '#ffd54f' } },
  cotton_shirt: { tpl: 'chest', pal: { c: '#e8dcc0', l: '#fff8e8' } },
  fuel_plate: { tpl: 'chest', pal: { c: '#f0c028', l: '#fff0a0' } },
  training_sword: { tpl: 'sword', pal: { w: '#a8743c', l: '#d8a86c', g: '#6a4424', y: '#ffd54f' } },
  pixel_broadsword: { tpl: 'sword', pal: { w: '#9aa4b4', l: '#e8f0ff', g: '#6a4424', y: '#ffd54f' } },
  convenience_club: { tpl: 'club', pal: { c: '#e07858', l: '#ffb49a', t: '#6a4424' } },
  starlight_staff: { tpl: 'staff', pal: { y: '#ffd54f', c: '#88c8ff', t: '#8a5a3a' } },
  aegis_shield: { tpl: 'shield', pal: { c: '#6b82b6', l: '#c5d4f5', y: '#ffd448' } },
  iron_helm: { tpl: 'helm', pal: { c: '#a0a8b4', l: '#e0e6ee', k: '#40444c' } },
  runner_sneakers: { tpl: 'boots', pal: { c: '#26c6da' } },
  golden_luck_ring: { tpl: 'ring', pal: { y: '#ff5252', c: '#ffc107' } },
};

const SKILL: Record<string, { tpl: string; pal: Palette }> = {
  basic_attack: { tpl: 'slash', pal: { w: '#ffffff' } },
  shield_bash: { tpl: 'guard', pal: { c: '#6b82b6', l: '#dfe8ff' } },
  taunt: { tpl: 'guard', pal: { c: '#e53935', l: '#ffb4b4' } },
  fireball: { tpl: 'fire', pal: { y: '#ffd54f', r: '#ff7043', o: '#ffab40' } },
  chain_lightning: { tpl: 'bolt', pal: { y: '#fff176' } },
  mana_shield: { tpl: 'guard', pal: { c: '#7e57c2', l: '#d1c4e9' } },
  shadow_step: { tpl: 'shadow', pal: { k: '#37303f', w: '#ff5252' } },
  poison_blade: { tpl: 'poison', pal: { g: '#7cb342', l: '#dcedc8' } },
  holy_heal: { tpl: 'heal', pal: { g: '#43a047', l: '#c8f7c5' } },
  blessing_of_light: { tpl: 'heal', pal: { g: '#f9a825', l: '#fff59d' } },
  snipe_shot: { tpl: 'arrow', pal: { y: '#cfd8dc', w: '#8d6e63', b: '#ef5350' } },
  walk: { tpl: 'run', pal: { s: '#f2c79b', c: '#ffa726', p: '#2b3a67', b: '#6a4424' } },
  flee: { tpl: 'flee', pal: { w: '#e0e6ee' } },
};

const cache = new Map<string, string>();

function url(key: string, def: { tpl: string; pal: Palette } | undefined): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const d = def ?? { tpl: 'stone', pal: { c: '#999999', l: '#dddddd' } };
  const u = shadeSprite(TPL[d.tpl]!, d.pal).toDataURL();
  cache.set(key, u);
  return u;
}

export const itemIconUrl = (itemId: string) => url(`i:${itemId}`, ITEM[itemId]);
export const skillIconUrl = (skillId: string) => url(`s:${skillId}`, SKILL[skillId] ?? SKILL.basic_attack);

/** Data URL of the hero paperdoll for the DOM equipment window. */
export function heroUrl(p: Paperdoll): string {
  return heroCanvas(p).toDataURL();
}
