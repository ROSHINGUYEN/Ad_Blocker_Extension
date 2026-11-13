// Query active tab domain and load real-time statistics
document.addEventListener('DOMContentLoaded', () => {
  // 1. Get current active tab domain
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

  // 2. Fetch and render protection statistics from Background Service Worker
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

  // 3. Bind Refresh button
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
});
