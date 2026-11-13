import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import { DOMRestorationManager } from '../src/dom/dom-restoration';

describe('DOMRestorationManager', () => {
  it('ẩn hai lần rồi restoreAll vẫn hiện lại phần tử (bug cũ: originalDisplay bị ghi đè = "none")', () => {
    const window = new Window();
    const el = window.document.createElement('div') as unknown as HTMLElement;
    window.document.body.appendChild(el as any);

    const m = new DOMRestorationManager();
    m.hideElement(el, 'a');
    m.hideElement(el, 'b');
    expect(m.getHiddenCount()).toBe(1);
    m.restoreAll();
    expect(el.style.display).toBe('');
  });
});
