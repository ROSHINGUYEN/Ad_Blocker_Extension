export interface HiddenElementRecord {
  element: HTMLElement;
  originalDisplay: string;
  originalVisibility: string;
  hiddenAt: number;
  reason: string;
}

/**
 * Manages element hiding with instant rollback / restoration capability.
 * Prevents layout destruction by tracking previous styles.
 */
export class DOMRestorationManager {
  private hiddenElements: Map<string, HiddenElementRecord> = new Map();
  private elementIdCounter = 0;

  /**
   * Safely hides an element while storing its original layout styles for restoration.
   */
  public hideElement(element: HTMLElement, reason: string): string {
    // Idempotent: ẩn lần 2 sẽ ghi đè originalDisplay = 'none' và làm restoreAll() không khôi phục được
    const already = element.getAttribute('data-shiori-hidden-id');
    if (already && this.hiddenElements.has(already)) {
      return already;
    }
    this.pruneDetached();
    const recordId = `hide_${++this.elementIdCounter}_${Date.now()}`;
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;

    this.hiddenElements.set(recordId, {
      element,
      originalDisplay,
      originalVisibility,
      hiddenAt: Date.now(),
      reason,
    });

    element.style.setProperty('display', 'none', 'important');
    element.setAttribute('data-shiori-hidden-id', recordId);
    return recordId;
  }

  /**
   * Restores an element back to its original layout styles.
   */
  public restoreElement(recordId: string): boolean {
    const record = this.hiddenElements.get(recordId);
    if (!record || !record.element) {
      return false;
    }

    record.element.style.removeProperty('display'); // gỡ cả cờ !important
    if (record.originalDisplay) record.element.style.display = record.originalDisplay;
    record.element.style.visibility = record.originalVisibility;
    record.element.removeAttribute('data-shiori-hidden-id');
    this.hiddenElements.delete(recordId);
    return true;
  }

  /**
   * Restores all elements hidden by Shiori on the current page.
   */
  public restoreAll(): number {
    let count = 0;
    for (const recordId of Array.from(this.hiddenElements.keys())) {
      if (this.restoreElement(recordId)) {
        count++;
      }
    }
    return count;
  }

  /** Giải phóng tham chiếu tới phần tử đã bị xoá khỏi DOM (tránh rò rỉ bộ nhớ). */
  private pruneDetached(): void {
    if (this.hiddenElements.size < 200) return;
    for (const [id, rec] of this.hiddenElements) {
      if (!rec.element.isConnected) this.hiddenElements.delete(id);
    }
  }

  public getHiddenCount(): number {
    return this.hiddenElements.size;
  }

  public clear(): void {
    this.hiddenElements.clear();
  }
}
