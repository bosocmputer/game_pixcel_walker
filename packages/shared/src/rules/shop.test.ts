import { describe, expect, it } from 'vitest';
import { CONSUMABLES, EQUIPMENT, MATERIALS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { SHOPS, shopForLandmark } from '../data/shops';
import { createRng } from './rng';
import { rollLoot } from './loot';
import { itemInfo, junkValue, meetsLevel, sellPrice, SELL_RATE_GEAR } from './shop';

describe('shops', () => {
  it('only stock items that exist, and map shops sit on their landmark', () => {
    for (const shop of Object.values(SHOPS)) {
      for (const id of shop.stock) expect(itemInfo(id), `${shop.id}: ${id}`).toBeDefined();
      if (shop.landmark) expect(shopForLandmark(shop.landmark)?.id).toBe(shop.id);
    }
  });

  it('never sell junk (junk is only bought from players)', () => {
    for (const shop of Object.values(SHOPS)) for (const id of shop.stock) expect(MATERIALS[id], id).toBeUndefined();
  });

  it('home does not buy — selling means visiting a shop on the map', () => {
    expect(SHOPS.home!.buys).toBe(false);
    expect(Object.values(SHOPS).filter((s) => s.buys).length).toBeGreaterThanOrEqual(3);
  });
});

describe('items', () => {
  it('every item has a price, a name, history text and a sane level requirement', () => {
    for (const e of Object.values(EQUIPMENT)) {
      expect(e.price, e.id).toBeGreaterThan(0);
      expect(e.lore?.length ?? 0, `${e.id} lore`).toBeGreaterThan(10);
      expect(e.level ?? 1, e.id).toBeGreaterThanOrEqual(1);
    }
    for (const m of Object.values(MATERIALS)) expect(m.lore.length, m.id).toBeGreaterThan(10);
    for (const c of Object.values(CONSUMABLES)) expect(c.lore?.length ?? 0, c.id).toBeGreaterThan(10);
  });

  it('ids are unique across equipment, consumables and materials', () => {
    const all = [...Object.keys(EQUIPMENT), ...Object.keys(CONSUMABLES), ...Object.keys(MATERIALS)];
    expect(new Set(all).size).toBe(all.length);
  });

  it('better grades cost more within a slot', () => {
    const order = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
    for (const slot of ['weapon', 'chest', 'helmet', 'accessory']) {
      const items = Object.values(EQUIPMENT).filter((e) => e.slot === slot);
      for (const a of items) for (const b of items) {
        if (order.indexOf(a.rarity) < order.indexOf(b.rarity)) expect(a.price, `${a.id} < ${b.id}`).toBeLessThan(b.price);
      }
    }
  });

  it('level requirements gate wearing gear', () => {
    expect(meetsLevel('elephant_amulet', 19)).toBe(false);
    expect(meetsLevel('elephant_amulet', 20)).toBe(true);
    expect(meetsLevel('red_potion', 1)).toBe(true);
    expect(meetsLevel('leather_garb', 1)).toBe(true);
    expect(meetsLevel('light_armor', 4)).toBe(false);
    expect(meetsLevel('light_armor', 5)).toBe(true);
  });
});

describe('selling', () => {
  it('pays full value for junk, 30% for gear, half that when broken', () => {
    expect(sellPrice('slime_goo')).toBe(MATERIALS.slime_goo!.price);
    expect(sellPrice('light_armor', 120)).toBe(Math.floor(450 * SELL_RATE_GEAR));
    expect(sellPrice('light_armor', 0)).toBe(Math.floor(450 * SELL_RATE_GEAR * 0.5));
    expect(sellPrice('red_potion')).toBeGreaterThanOrEqual(1);
    expect(sellPrice('red_potion')).toBeLessThan(CONSUMABLES.red_potion!.price);
    expect(sellPrice('nope')).toBe(0);
  });

  it('never lets a buy-then-sell loop make money', () => {
    for (const shop of Object.values(SHOPS)) for (const id of shop.stock) expect(sellPrice(id), id).toBeLessThan(itemInfo(id)!.price);
  });

  it('sums the junk in a bag and ignores everything else', () => {
    expect(junkValue({ slime_goo: 3, rat_tail: 2, red_potion: 5 })).toBe(3 * 3 + 2 * 4);
  });
});

describe('monster junk drops', () => {
  it('every drop refers to a real item', () => {
    for (const m of Object.values(MONSTERS)) for (const d of m.drops) expect(itemInfo(d.itemId), `${m.id}: ${d.itemId}`).toBeDefined();
  });

  it('every fighting monster drops some junk, pricier the stronger it is', () => {
    const field = Object.values(MONSTERS).filter((m) => !m.passive);
    for (const m of field) expect(m.drops.some((d) => MATERIALS[d.itemId]), m.id).toBe(true);
    const value = (id: string) => MATERIALS[MONSTERS[id]!.drops.find((d) => MATERIALS[d.itemId])!.itemId]!.price;
    expect(value('pixel_slime')).toBeLessThan(value('moat_python'));
    expect(value('moat_python')).toBeLessThan(value('stone_elephant'));
  });

  it('rolls junk into the loot often enough to matter for new players', () => {
    const rng = createRng(42);
    let got = 0;
    for (let i = 0; i < 200; i++) got += rollLoot('pixel_slime', rng).items.slime_goo ?? 0;
    expect(got).toBeGreaterThan(150);
  });
});
