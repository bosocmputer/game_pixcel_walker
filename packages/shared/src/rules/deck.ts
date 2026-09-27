/** Skill deck editing (the 6-slot loadout picked in the skill window). Pure; the UI calls these. */
import { DECK_SIZE } from '../combat/types';
import { CLASSES, classSkillPool } from '../data/classes';
import type { ClassId } from '../types';

/**
 * Put `skillId` into deck slot `slot`. If the skill is already in the deck it swaps places with
 * whatever is in `slot`; a slot past the end appends. Returns a new array (≤ max skills).
 */
export function assignDeckSlot(deck: string[], slot: number, skillId: string, max = DECK_SIZE): string[] {
  const out = [...deck];
  const at = out.indexOf(skillId);
  if (slot >= out.length) {
    if (at >= 0) return out; // already in the deck; nothing to move into an empty tail slot
    return out.length < max ? [...out, skillId] : out;
  }
  if (at >= 0) {
    [out[slot], out[at]] = [out[at]!, out[slot]!];
    return out;
  }
  out[slot] = skillId;
  return out;
}

/**
 * A ready-to-fight deck for a class: its own kit first, then Novice skills to fill the slots.
 * Used by the admin class switch so a tester sees the class's skills straight away.
 */
export function classStarterDeck(classId: ClassId, max = DECK_SIZE): string[] {
  const own = classId === 'NOVICE' ? [] : CLASSES[classId].skills;
  const rest = classSkillPool(classId).filter((id) => !own.includes(id));
  return [...own, ...rest].slice(0, max);
}

/** Empty deck slot `slot` (later skills shift left). */
export function clearDeckSlot(deck: string[], slot: number): string[] {
  return deck.filter((_, i) => i !== slot);
}
