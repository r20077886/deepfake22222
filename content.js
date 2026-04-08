/* ═══════════════════════════════════════════════════════════════
   TruthLens Content Script – Real-time Deepfake Detection
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────
  const MIN_SIZE        = 80;   // px – ignore tiny icons/thumbnails
  const ATTR_PROCESSED  = 'data-tl-processed';
  const ATTR_VERDICT    = 'data-tl-verdict';

  // ─── State ─────────────────────────────────────────────────────
  let isEnabled     = true;
  let activeTooltip = null;
  let scanCount     = 0;
  let fakeCount     = 0;
  let suspCount     = 0;

  // ─── Init ───────────────────────────────────────────────────────
  init();

  async function init() {
    // Check if detection is toggled on/off for this tab
    const resp = await sendMessage({ type: 'IS_ENABLED' });
    isEnabled = resp?.enabled !== false;

    if (!isEnabled) return;

    scanAllMedia();
    observeNewMedia();
  }

  // ─── Utilities ──────────────────────────────────────────────────
  function sendMessage(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(res);
        });
      } catch (_) { resolve(null); }
    });
  }

  function isLargeEnough(el) {
    const r = el.getBoundingClientRect();
    return r.width >= MIN_SIZE && r.height >= MIN_SIZE;
  }

  function getMediaSrc(el) {
    if (el.tagName === 'IMG')   return el.currentSrc || el.src;
    if (el.tagName === 'VIDEO') return el.currentSrc || el.src || (el.querySelector('source')?.src);
    return null;
  }

  // ─── Badge & Tooltip ────────────────────────────────────────────
  const VERDICT_META = {
    real:       { icon: '✅', label: 'Real',       cls: 'tl-real',       badgeCls: 'tl-badge-real' },
    fake:       { icon: '🚨', label: 'Deepfake',   cls: 'tl-fake',       badgeCls: 'tl-badge-fake' },
    suspicious: { icon: '⚠️', label: 'Suspicious', cls: 'tl-suspicious', badgeCls: 'tl-badge-suspicious' },
  };

  function createBadge(result) {
    const meta = VERDICT_META[result.verdict];
    const badge = document.createElement('div');
    badge.className = `tl-badge ${meta.badgeCls}`;
    badge.innerHTML = `
      <span class="tl-badge-icon">${meta.icon}</span>
      <span class="tl-badge-text">${meta.label} – ${result.confidence}%</span>
    `;
    return badge;
  }

  function showTooltip(result, badge) {
    removeTooltip();
    const meta = VERDICT_META[result.verdict];
    const tip  = document.createElement('div');
    tip.className = 'tl-tooltip';

    const reasonsHTML = result.reasons.map(r => `<li>${r}</li>`).join('');

    tip.innerHTML = `
      <div class="tl-tooltip-header">
        <span class="tl-tooltip-verdict ${result.verdict}">${meta.icon} ${meta.label.toUpperCase()}</span>
        <span class="tl-tooltip-confidence">${result.confidence}% confidence</span>
      </div>
      <div class="tl-tooltip-bar-wrap">
        <div class="tl-tooltip-bar ${result.verdict}" style="width:${result.confidence}%"></div>
      </div>
      <div class="tl-tooltip-label">Why this is ${result.verdict === 'real' ? 'genuine' : 'flagged'}</div>
      <ul class="tl-tooltip-reasons">${reasonsHTML}</ul>
      <div class="tl-tooltip-footer">🔬 TruthLens • Educational Use Only</div>
    `;

    document.body.appendChild(tip);
    activeTooltip = tip;

    positionTooltip(tip, badge);
    return tip;
  }

  function positionTooltip(tip, anchor) {
    const ar = anchor.getBoundingClientRect();
    const tw = 260, th = tip.offsetHeight || 180;
    let left = ar.left;
    let top  = ar.bottom + 8;

    if (left + tw > window.innerWidth - 10)  left = window.innerWidth - tw - 10;
    if (top + th  > window.innerHeight - 10) top  = ar.top - th - 8;
    if (left < 10) left = 10;

    tip.style.left = `${left}px`;
    tip.style.top  = `${top}px`;
  }

  function removeTooltip() {
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
  }

  // ─── Element Wrapping ───────────────────────────────────────────
  function wrapElement(el) {
    if (el.parentElement?.classList.contains('tl-wrapper')) return el.parentElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'tl-wrapper';
    // Copy sizing hints
    wrapper.style.cssText = `
      display: inline-block;
      position: relative;
      max-width: 100%;
      line-height: 0;
    `;
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    return wrapper;
  }

  function addScanLine(wrapper) {
    const line = document.createElement('div');
    line.className = 'tl-scan-line';
    wrapper.appendChild(line);
    return line;
  }

  // ─── Core: Analyze a single media element ───────────────────────
  async function analyzeElement(el) {
    if (el.hasAttribute(ATTR_PROCESSED)) return;
    if (!isLargeEnough(el))             return;

    const src = getMediaSrc(el);
    if (!src || src.startsWith('data:')) return;  // skip data URIs for perf

    // Mark as processing
    el.setAttribute(ATTR_PROCESSED, 'analyzing');
    el.classList.add('tl-scanning');

    const wrapper  = wrapElement(el);
    const scanLine = addScanLine(wrapper);

    // Ask background to analyze
    const res = await sendMessage({ type: 'ANALYZE_MEDIA', url: src, mediaType: el.tagName === 'IMG' ? 'image' : 'video' });

    // Remove scan indicators
    el.classList.remove('tl-scanning');
    scanLine.remove();

    if (!res?.success || !isEnabled) {
      el.setAttribute(ATTR_PROCESSED, 'error');
      return;
    }

    const result = res.result;
    el.setAttribute(ATTR_PROCESSED, 'done');
    el.setAttribute(ATTR_VERDICT,   result.verdict);

    // Apply verdict border
    const meta = VERDICT_META[result.verdict];
    el.classList.add(meta.cls);

    // Create badge
    const badge = createBadge(result);
    wrapper.appendChild(badge);

    // Tooltip on hover
    badge.addEventListener('mouseenter', () => showTooltip(result, badge));
    badge.addEventListener('mouseleave', removeTooltip);
    el.addEventListener('mouseleave', removeTooltip);

    // Update counts
    scanCount++;
    if (result.verdict === 'fake')       fakeCount++;
    if (result.verdict === 'suspicious') suspCount++;

    // Show warning banner if page has many fakes
    checkPageRisk();
  }

  // ─── Page Risk Banner ───────────────────────────────────────────
  let bannerShown = false;
  function checkPageRisk() {
    if (bannerShown) return;
    if (fakeCount >= 2 || (fakeCount >= 1 && suspCount >= 2)) {
      showWarningBanner();
    }
  }

  function showWarningBanner() {
    if (document.getElementById('tl-warning-banner')) return;
    bannerShown = true;

    const banner = document.createElement('div');
    banner.id = 'tl-warning-banner';
    banner.innerHTML = `
      <span class="tl-banner-icon">🚨</span>
      <span>TruthLens detected deepfake or AI-generated content on this page. Verify before sharing.</span>
      <button class="tl-banner-close" title="Dismiss">✕</button>
    `;

    // Push page down to avoid covering content
    document.body.style.marginTop = `${parseInt(document.body.style.marginTop || 0) + 42}px`;
    document.body.prepend(banner);

    banner.querySelector('.tl-banner-close').addEventListener('click', () => {
      document.body.style.marginTop = `${Math.max(0, parseInt(document.body.style.marginTop || 0) - 42)}px`;
      banner.remove();
    });
  }

  // ─── Scan All Media ─────────────────────────────────────────────
  function scanAllMedia() {
    const elements = document.querySelectorAll('img, video');
    elements.forEach(el => analyzeElement(el).catch(() => {}));
  }

  // ─── MutationObserver – real-time DOM watching ──────────────────
  function observeNewMedia() {
    const observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('img, video')) analyzeElement(node).catch(() => {});
          node.querySelectorAll?.('img, video').forEach(el => analyzeElement(el).catch(() => {}));
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also re-scan on scroll (lazy-loaded images)
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (isEnabled) scanAllMedia();
      }, 300);
    }, { passive: true });
  }

  // ─── Listen for toggle from popup ───────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SET_ENABLED') {
      isEnabled = message.enabled;
      if (isEnabled) {
        scanAllMedia();
      } else {
        // Remove all TL overlays
        document.querySelectorAll('[data-tl-processed]').forEach(el => {
          el.removeAttribute(ATTR_PROCESSED);
          el.removeAttribute(ATTR_VERDICT);
          el.classList.remove('tl-scanning', 'tl-real', 'tl-fake', 'tl-suspicious');
          const wrapper = el.parentElement;
          if (wrapper?.classList.contains('tl-wrapper')) {
            wrapper.querySelectorAll('.tl-badge, .tl-scan-line').forEach(b => b.remove());
          }
        });
        removeTooltip();
      }
    }
  });

})();
