/** 16-bit UI helpers: interface icons from pixel-art/ui-kit (served at /assets/ui/i-<name>.png). */
export type UiIcon =
  | 'char' | 'bag' | 'party' | 'home' | 'settings' | 'auto' | 'plus' | 'minus' | 'compass' | 'run'
  | 'pin' | 'coin' | 'swords' | 'skull' | 'close' | 'heart' | 'drop' | 'star' | 'chat';

/** 16x16 icon shown at 2x (32px) — or `small` for 1x inline use in text. */
export function uiIcon(name: UiIcon, small = false): string {
  return `<img class="px-ico${small ? ' sm' : ''}" src="/assets/ui/i-${name}.png" alt="" draggable="false" />`;
}

/** Font stack for canvas text: pixel font for Latin/numbers, blocky Thai fallback. */
export const PIXEL_FONT = '"Silkscreen", "Chakra Petch", sans-serif';
