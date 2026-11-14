"use strict";
(() => {
  // popup/popup.ts
  document.addEventListener("DOMContentLoaded", () => {
    const toggleInput = document.getElementById("site-toggle");
    const statusBadge = document.querySelector(".badge-protect span:last-child");
    const pulseDot = document.querySelector(".pulse-dot");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["shiori_enabled"], (res) => {
        const isEnabled = res && typeof res.shiori_enabled === "boolean" ? res.shiori_enabled : true;
        if (toggleInput) toggleInput.checked = isEnabled;
        updateStatusUI(isEnabled);
      });
    }
    function updateStatusUI(isEnabled) {
      if (statusBadge) {
        statusBadge.textContent = isEnabled ? "ACTIVE" : "PAUSED";
        statusBadge.parentElement.style.color = isEnabled ? "#4ade80" : "#f87171";
        statusBadge.parentElement.style.background = isEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
        statusBadge.parentElement.style.borderColor = isEnabled ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)";
      }
      if (pulseDot) {
        pulseDot.style.background = isEnabled ? "#4ade80" : "#f87171";
        pulseDot.style.boxShadow = isEnabled ? "0 0 8px #4ade80" : "0 0 8px #f87171";
      }
    }
    if (toggleInput) {
      toggleInput.addEventListener("change", () => {
        const isEnabled = toggleInput.checked;
        updateStatusUI(isEnabled);
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ shiori_enabled: isEnabled });
        }
      });
    }
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url) {
          try {
            const url = new URL(activeTab.url);
            const domainElem = document.getElementById("current-domain");
            if (domainElem) {
              domainElem.textContent = url.hostname || "Trang n\u1ED9i b\u1ED9";
            }
          } catch {
          }
        }
      });
    }
    function updateStats() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["shiori_stats"], (data) => {
          const stats = data?.shiori_stats;
          if (stats) {
            const popupElem = document.getElementById("stat-popups");
            const domElem = document.getElementById("stat-dom");
            const netElem = document.getElementById("stat-network");
            if (popupElem) popupElem.textContent = String(stats.redirectsBlocked || 0);
            if (domElem) domElem.textContent = String(stats.elementsHidden || 0);
            if (netElem) netElem.textContent = String(stats.requestsFiltered || 0);
          }
        });
      }
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "GET_STATS" }, (res) => {
          if (res?.stats) {
            const popupElem = document.getElementById("stat-popups");
            const domElem = document.getElementById("stat-dom");
            const netElem = document.getElementById("stat-network");
            if (popupElem) popupElem.textContent = String(res.stats.redirectsBlocked || 0);
            if (domElem) domElem.textContent = String(res.stats.elementsHidden || 0);
            if (netElem) netElem.textContent = String(res.stats.requestsFiltered || 0);
          }
        });
      }
    }
    updateStats();
    setInterval(updateStats, 1e3);
    const refreshBtn = document.getElementById("btn-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.reload) {
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
})();
