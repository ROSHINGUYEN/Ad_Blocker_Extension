if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
    if (res?.stats) {
      const netElem = document.getElementById('net-blocked');
      const domElem = document.getElementById('dom-hidden');
      if (netElem) netElem.textContent = String(res.stats.requestsFiltered || 0);
      if (domElem) domElem.textContent = String(res.stats.elementsHidden || 0);
    }
  });
}
