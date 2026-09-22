/** Party rules shared by client and server: leash radius and co-op field fight scaling. */
import { haversine } from './walk';

/** Members must stay within this distance of the party; also the invite and join range. */
export const PARTY_RANGE_M = 200;
/** How long a member may stay out of range (GPS jitter) before being dropped from the party. */
export const PARTY_LEASH_GRACE_MS = 10_000;
/** Enemy HP multiplier for a co-op field fight: grows sub-linearly so grouping stays worthwhile. */
export const PARTY_FIELD_HP_EXP = 0.6;

export interface MemberPos {
  id: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Members farther than `range` from every other located member. Unlocated members are neither
 * checked nor used as anchors. With two members out of range, both are isolated (party splits).
 */
export function isolatedMembers(members: MemberPos[], range = PARTY_RANGE_M): string[] {
  const located = members.filter((m) => m.lat !== null && m.lng !== null) as { id: string; lat: number; lng: number }[];
  if (located.length < 2) return [];
  return located
    .filter((m) => located.every((o) => o === m || haversine(m, o) > range))
    .map((m) => m.id);
}

/** Field monsters fought by `partySize` players get this HP multiplier (ATK unchanged). */
export function partyFieldHpScale(partySize: number): number {
  return Math.pow(Math.max(1, partySize), PARTY_FIELD_HP_EXP);
}
