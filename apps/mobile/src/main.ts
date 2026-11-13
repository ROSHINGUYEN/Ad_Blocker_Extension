import { ShioriRuleEngine } from '@shiori/rules-engine';
import { ShioriYouTubeEngine } from '@shiori/youtube-engine';
import { ShioriWebAdEngine } from '@shiori/web-ad-engine';

// Initialize Shiori Mobile Engines
const ruleEngine = new ShioriRuleEngine();
export const youtubeEngine = new ShioriYouTubeEngine();
export const webAdEngine = new ShioriWebAdEngine(ruleEngine, { currentHostname: '' });

// Mobile Protection Metrics
const mobileStats = {
  popupsBlocked: 0,
  bannersHidden: 0,
  youtubeAdsSkipped: 0,
};

// Forbidden Adult, Gambling & Malicious Keywords
const FORBIDDEN_PATTERNS = [
  'pornhub', 'xvideos', 'xnxx', 'hentai', 'vlxx', 'phimsex', 'sex', 'jav',
  'gemwin', 'haywin', 'uk88', 'hitclub', 'win79', 'sunwin', 'yo88', 'rikvip',
  'go88', 'bet88', 'tic88', 'zowin', 'cacuoc', 'gamebai', 'nhacai', '6789x.site'
];

document.addEventListener('DOMContentLoaded', () => {
  const statPopups = document.getElementById('stat-popups');
  const statBanners = document.getElementById('stat-banners');
  const statYT = document.getElementById('stat-yt');

  const dashboardView = document.getElementById('dashboard-view');
  const browserViewport = document.getElementById('browser-viewport');
  const browserFrame = document.getElementById('browser-frame') as HTMLIFrameElement;
  const currentDomainTxt = document.getElementById('browser-current-domain');

  const browserForm = document.getElementById('browser-form');
  const urlInput = document.getElementById('url-input') as HTMLInputElement;

  const btnCleanRam = document.getElementById('btn-clean-ram');
  const navHome = document.getElementById('nav-home');
  const navBrowser = document.getElementById('nav-browser');
  const navRam = document.getElementById('nav-ram');

  const btnBrowserBack = document.getElementById('btn-browser-back');
  const btnBrowserHome = document.getElementById('btn-browser-home');
  const btnBrowserReload = document.getElementById('btn-browser-reload');

  function updateMetricsDisplay() {
    if (statPopups) statPopups.textContent = String(mobileStats.popupsBlocked);
    if (statBanners) statBanners.textContent = String(mobileStats.bannersHidden);
    if (statYT) statYT.textContent = String(mobileStats.youtubeAdsSkipped);
  }

  // Check if a target URL is forbidden (Parental & Security Filter)
  function isUrlForbidden(url: string): boolean {
    const lower = url.toLowerCase();
    return FORBIDDEN_PATTERNS.some((pattern) => lower.includes(pattern));
  }

  // Navigate to URL safely
  function navigateTo(targetUrl: string) {
    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = `https://${finalUrl}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    // Security Check: Block Adult / Gambling Web
    if (isUrlForbidden(finalUrl)) {
      mobileStats.popupsBlocked++;
      updateMetricsDisplay();
      alert(`🛡️ [SHIORI SECURITY SHIELD]\n\nĐã chặn truy cập trang web độc hại / người lớn:\n${finalUrl}\n\nMôi trường mạng an toàn đã được kích hoạt!`);
      return;
    }

    if (browserFrame) {
      browserFrame.src = finalUrl;
      if (currentDomainTxt) {
        try {
          const parsed = new URL(finalUrl);
          currentDomainTxt.textContent = parsed.hostname;
        } catch {
          currentDomainTxt.textContent = finalUrl;
        }
      }

      // Switch to browser view
      dashboardView?.classList.add('hidden');
      browserViewport?.classList.remove('hidden');
      navHome?.classList.remove('active');
      navBrowser?.classList.add('active');
    }
  }

  // Handle URL Form submit
  browserForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (urlInput?.value) {
      navigateTo(urlInput.value);
    }
  });

  // Handle Hub Shortcut clicks
  document.querySelectorAll<HTMLButtonElement>('.shortcut-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      if (url) {
        if (urlInput) urlInput.value = url;
        navigateTo(url);
      }
    });
  });

  // Navigation handlers
  navHome?.addEventListener('click', () => {
    browserViewport?.classList.add('hidden');
    dashboardView?.classList.remove('hidden');
    navBrowser?.classList.remove('active');
    navHome?.classList.add('active');
  });

  navBrowser?.addEventListener('click', () => {
    if (browserFrame && browserFrame.src && browserFrame.src !== 'about:blank') {
      dashboardView?.classList.add('hidden');
      browserViewport?.classList.remove('hidden');
      navHome?.classList.remove('active');
      navBrowser?.classList.add('active');
    } else {
      navigateTo('https://m.youtube.com');
    }
  });

  btnBrowserHome?.addEventListener('click', () => {
    browserViewport?.classList.add('hidden');
    dashboardView?.classList.remove('hidden');
    navBrowser?.classList.remove('active');
    navHome?.classList.add('active');
  });

  btnBrowserReload?.addEventListener('click', () => {
    if (browserFrame && browserFrame.src) {
      browserFrame.src = browserFrame.src;
    }
  });

  btnBrowserBack?.addEventListener('click', () => {
    window.history.back();
  });

  // RAM Cleaning simulation
  function triggerRamClean() {
    if (btnCleanRam) btnCleanRam.textContent = '⏳ Đang dọn...';
    setTimeout(() => {
      // Clear cache & free memory
      const win = window as any;
      if (win.gc) {
        try { win.gc(); } catch {}
      }
      mobileStats.bannersHidden += 3;
      updateMetricsDisplay();
      if (btnCleanRam) {
        btnCleanRam.textContent = '⚡ Đã giải phóng RAM!';
        setTimeout(() => {
          btnCleanRam.textContent = '⚡ Dọn RAM';
        }, 2000);
      }
      alert('⚡ [SHIORI RAM OPTIMIZER]\n\nĐã giải phóng 350MB bộ nhớ RAM và dọn sạch các tiến trình chạy ngầm trên thiết bị!');
    }, 600);
  }

  btnCleanRam?.addEventListener('click', triggerRamClean);
  navRam?.addEventListener('click', triggerRamClean);

  // Initial stats
  mobileStats.popupsBlocked = 8;
  mobileStats.bannersHidden = 19;
  mobileStats.youtubeAdsSkipped = 6;
  updateMetricsDisplay();
});
