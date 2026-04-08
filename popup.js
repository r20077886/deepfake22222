/* ══════════════════════════════════════════════════════
   TruthLens Popup – Logic
   ══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  // Elements
  const toggleEl    = $('toggleDetection');
  const statusPill  = $('statusPill');
  const statusText  = $('statusText');
  const riskValue   = $('riskValue');
  const riskBarFill = $('riskBarFill');
  const riskCard    = $('riskCard');
  const statScanned = $('statScanned');
  const statFake    = $('statFake');
  const statSusp    = $('statSusp');
  const statReal    = $('statReal');
  const btnRescan   = $('btnRescan');
  const btnReset    = $('btnReset');

  // ─── Load initial state ────────────────────────────────────────
  const stateRes = await sendMsg({ type: 'GET_STATS' });
  const initialState = stateRes?.state ?? { enabled: true, stats: { scanned: 0, fake: 0, suspicious: 0 } };

  toggleEl.checked = initialState.enabled;
  applyToggleUI(initialState.enabled);
  renderStats(initialState.stats);

  // ─── Toggle Detection ──────────────────────────────────────────
  toggleEl.addEventListener('change', async () => {
    const enabled = toggleEl.checked;
    applyToggleUI(enabled);

    // Notify background
    await sendMsg({ type: 'TOGGLE_DETECTION', enabled });

    // Notify active content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SET_ENABLED', enabled }).catch(() => {});
    }
  });

  // ─── Rescan button ─────────────────────────────────────────────
  btnRescan.addEventListener('click', async () => {
    btnRescan.textContent = '…';
    btnRescan.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Re-inject content script to force re-scan
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Remove TL markers so content script re-processes everything
          document.querySelectorAll('[data-tl-processed]').forEach(el => {
            el.removeAttribute('data-tl-processed');
            el.removeAttribute('data-tl-verdict');
            el.classList.remove('tl-scanning', 'tl-real', 'tl-fake', 'tl-suspicious');
          });
          document.querySelectorAll('.tl-badge, .tl-scan-line').forEach(b => b.remove());
          const banner = document.getElementById('tl-warning-banner');
          if (banner) banner.remove();
        }
      }).catch(() => {});

      // Reset stats and re-inject
      await sendMsg({ type: 'RESET_STATS' });
      renderStats({ scanned: 0, fake: 0, suspicious: 0 });

      // Reload content scripts
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).catch(() => {});
    }

    setTimeout(() => {
      btnRescan.textContent = '↺ Rescan';
      btnRescan.disabled = false;
      refreshStats();
    }, 2500);
  });

  // ─── Reset / Clear ─────────────────────────────────────────────
  btnReset.addEventListener('click', async () => {
    await sendMsg({ type: 'RESET_STATS' });
    renderStats({ scanned: 0, fake: 0, suspicious: 0 });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document.querySelectorAll('[data-tl-processed]').forEach(el => {
            el.removeAttribute('data-tl-processed');
            el.removeAttribute('data-tl-verdict');
            el.classList.remove('tl-real', 'tl-fake', 'tl-suspicious');
          });
          document.querySelectorAll('.tl-badge, .tl-scan-line').forEach(b => b.remove());
          const banner = document.getElementById('tl-warning-banner');
          if (banner) banner.remove();
        }
      }).catch(() => {});
    }
  });

  // ─── Auto-refresh stats while popup is open ────────────────────
  const refreshInterval = setInterval(refreshStats, 1500);
  window.addEventListener('unload', () => clearInterval(refreshInterval));

  async function refreshStats() {
    const res = await sendMsg({ type: 'GET_STATS' });
    if (res?.success) renderStats(res.state.stats);
  }

  // ─── Render helpers ────────────────────────────────────────────
  function renderStats(stats) {
    const { scanned = 0, fake = 0, suspicious = 0 } = stats;
    const real = Math.max(0, scanned - fake - suspicious);

    animateNum(statScanned, scanned);
    animateNum(statFake,    fake);
    animateNum(statSusp,    suspicious);
    animateNum(statReal,    real);

    // Risk level
    const { label, color, barColor, pct } = calcRisk(scanned, fake, suspicious);
    riskValue.textContent = scanned === 0 ? 'Analyzing…' : label;
    riskValue.style.color = color;
    riskBarFill.style.width = `${pct}%`;
    riskBarFill.style.background = barColor;
  }

  function calcRisk(scanned, fake, suspicious) {
    if (scanned === 0) return { label: 'Analyzing…', color: '#5c6882', barColor: '#5c6882', pct: 0 };
    const fakePct = (fake / scanned) * 100;
    const suspPct = (suspicious / scanned) * 100;

    if (fakePct >= 40 || (fakePct >= 20 && suspPct >= 20)) {
      return { label: '🔴 High Risk', color: '#f55f5f', barColor: 'linear-gradient(90deg,#c53030,#f55f5f)', pct: 85 };
    }
    if (fakePct >= 15 || suspPct >= 30) {
      return { label: '🟡 Medium Risk', color: '#f6c90e', barColor: 'linear-gradient(90deg,#b7791f,#f6c90e)', pct: 50 };
    }
    if (scanned > 0) {
      return { label: '🟢 Low Risk', color: '#3ecf6c', barColor: 'linear-gradient(90deg,#276749,#3ecf6c)', pct: 20 };
    }
    return { label: 'Analyzing…', color: '#5c6882', barColor: '#5c6882', pct: 0 };
  }

  function applyToggleUI(enabled) {
    if (enabled) {
      statusPill.classList.remove('off');
      statusText.textContent = 'Scanning active';
    } else {
      statusPill.classList.add('off');
      statusText.textContent = 'Detection paused';
    }
  }

  // Smooth counter animation
  function animateNum(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const step = target > current ? 1 : -1;
    const steps = Math.abs(target - current);
    const delay = Math.max(20, Math.min(80, 300 / steps));
    let i = 0;
    const timer = setInterval(() => {
      el.textContent = current + step * (++i);
      if (i >= steps) clearInterval(timer);
    }, delay);
  }

  // ─── Message helper ────────────────────────────────────────────
  function sendMsg(msg) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(msg, res => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(res);
      });
    });
  }
});
