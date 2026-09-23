/** Skill deck editing (the 6-slot loadout picked in the skill window). Pure; the UI calls these. */
import { DECK_SIZE } from '../combat/types';

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

/** Empty deck slot `slot` (later skills shift left). */
export function clearDeckSlot(deck: string[], slot: number): string[] {
  return deck.filter((_, i) => i !== slot);
}
