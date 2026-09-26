/**
 * Pixel speech bubbles over characters on the map (chat). One bubble per speaker; a new line
 * replaces the old one. Bubbles are positioned every frame by whoever draws the speaker.
 */
import Phaser from 'phaser';
import { bubbleMs, type ChatChannel } from '@pw/shared';
import { PIXEL_FONT } from '../ui/pixel';

const INK = 0x1c1a28;
const MAX_W = 150;
const PAD = 5;

interface Bubble {
  box: Phaser.GameObjects.Container;
  until: number;
}

export class ChatBubbles {
  private bubbles = new Map<string, Bubble>();

  constructor(private scene: Phaser.Scene) {}

  show(id: string, text: string, channel: ChatChannel) {
    this.bubbles.get(id)?.box.destroy();
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: PIXEL_FONT,
        fontSize: '12px',
        color: '#1c1a28',
        wordWrap: { width: MAX_W, useAdvancedWrap: true },
        lineSpacing: 2,
      })
      .setOrigin(0.5, 1);
    const w = Math.ceil(label.width) + PAD * 2;
    const h = Math.ceil(label.height) + PAD * 2;
    const fill = channel === 'party' ? 0xe2ffd8 : 0xffffff;
    const g = this.scene.add.graphics();
    // Pixel bubble: ink border, flat fill, a notched corner look, and a tail pointing down.
    g.fillStyle(INK, 1).fillRect(-w / 2 - 2, -h - 8, w + 4, h + 4).fillRect(-5, -6, 10, 2).fillRect(-3, -4, 6, 2).fillRect(-1, -2, 2, 2);
    g.fillStyle(fill, 1).fillRect(-w / 2, -h - 6, w, h).fillRect(-3, -6, 6, 2).fillRect(-1, -4, 2, 2);
    g.fillStyle(channel === 'party' ? 0x9cd88c : 0xd8d8e0, 1).fillRect(-w / 2, -8, w, 2);
    label.setPosition(0, -6 - PAD);
    const box = this.scene.add.container(0, 0, [g, label]).setDepth(40).setAlpha(0);
    this.scene.tweens.add({ targets: box, alpha: 1, duration: 150 });
    this.bubbles.set(id, { box, until: Date.now() + bubbleMs(text) });
  }

  /** Called each frame by the scene that draws the speaker; (x, y) = top of their head. */
  place(id: string, x: number, y: number, visible: boolean, scale = 1) {
    const b = this.bubbles.get(id);
    if (b) b.box.setPosition(Math.round(x), Math.round(y)).setVisible(visible).setScale(scale);
  }

  prune(now = Date.now()) {
    for (const [id, b] of this.bubbles) {
      if (now < b.until) continue;
      this.bubbles.delete(id);
      this.scene.tweens.add({ targets: b.box, alpha: 0, duration: 250, onComplete: () => b.box.destroy() });
    }
  }
}
