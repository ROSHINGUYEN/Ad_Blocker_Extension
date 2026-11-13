// Query active tab domain and load real-time statistics
document.addEventListener('DOMContentLoaded', () => {
  const toggleInput = document.getElementById('site-toggle') as HTMLInputElement | null;
  const statusBadge = document.querySelector('.badge-protect span:last-child') as HTMLElement | null;
  const pulseDot = document.querySelector('.pulse-dot') as HTMLElement | null;

  // 1. Get current protection state from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['shiori_enabled'], (res) => {
      const isEnabled = res && typeof res.shiori_enabled === 'boolean' ? res.shiori_enabled : true;
      if (toggleInput) toggleInput.checked = isEnabled;
      updateStatusUI(isEnabled);
    });
  }

  function updateStatusUI(isEnabled: boolean) {
    if (statusBadge) {
      statusBadge.textContent = isEnabled ? 'ACTIVE' : 'PAUSED';
      statusBadge.parentElement!.style.color = isEnabled ? '#4ade80' : '#f87171';
      statusBadge.parentElement!.style.background = isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      statusBadge.parentElement!.style.borderColor = isEnabled ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)';
    }
    if (pulseDot) {
      pulseDot.style.background = isEnabled ? '#4ade80' : '#f87171';
      pulseDot.style.boxShadow = isEnabled ? '0 0 8px #4ade80' : '0 0 8px #f87171';
    }
  }

  // Handle User Toggle on/off
  if (toggleInput) {
    toggleInput.addEventListener('change', () => {
      const isEnabled = toggleInput.checked;
      updateStatusUI(isEnabled);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ shiori_enabled: isEnabled });
      }
    });
  }

  // 2. Get current active tab domain
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url) {
        try {
          const url = new URL(activeTab.url);
          const domainElem = document.getElementById('current-domain');
          if (domainElem) {
            domainElem.textContent = url.hostname || 'Trang nội bộ';
          }
        } catch {
          // Ignore
        }
      }
    });
  }

  // 3. Fetch and render protection statistics from Background Service Worker
  function updateStats() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
        if (res?.stats) {
          const popupElem = document.getElementById('stat-popups');
          const domElem = document.getElementById('stat-dom');
          const netElem = document.getElementById('stat-network');

          if (popupElem) popupElem.textContent = String(res.stats.redirectsBlocked || 0);
          if (domElem) domElem.textContent = String(res.stats.elementsHidden || 0);
          if (netElem) netElem.textContent = String(res.stats.requestsFiltered || 0);
        }
      });
    }
  }

  updateStats();

  // 4. Bind Refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.reload) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
            window.close();
          }
        });
      }
    });
  }

  // 5. Bind RAM Optimizer & Clean Cache button
  const ramBtn = document.getElementById('btn-ram') as HTMLButtonElement | null;
  if (ramBtn) {
    const send = <T,>(message: { type: string }) =>
      new Promise<T | undefined>((resolve) => {
        chrome.runtime.sendMessage(message, (res: T | undefined) => {
          void chrome.runtime.lastError; // tránh "Unchecked runtime.lastError"
          resolve(res);
        });
      });

    ramBtn.addEventListener('click', async () => {
      if (ramBtn.disabled) return; // chống bấm đúp
      ramBtn.disabled = true;
      ramBtn.textContent = '⏳ Đang tối ưu...';
      try {
        const mem = await send<{ count?: number; closed?: number }>({ type: 'CLEAN_MEMORY_NOW' });
        await send({ type: 'CLEAR_CACHE_NOW' });
        const total = (mem?.count || 0) + (mem?.closed || 0);
        ramBtn.textContent = total > 0 ? `⚡ Đã giải phóng ${total} tab!` : '⚡ Đã dọn bộ nhớ đệm!';
      } catch {
        ramBtn.textContent = '⚠️ Không thể tối ưu';
      } finally {
        setTimeout(() => {
          ramBtn.textContent = '⚡ Tối ưu RAM';
          ramBtn.disabled = false;
        }, 2500);
      }
    });
  }
});
