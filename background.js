// TruthLens Background Service Worker
// Handles API communication and extension state

// ─── State ───────────────────────────────────────────────────────────────────
const tabState = {}; // { [tabId]: { enabled, stats } }

// ─── Mock API – Deepfake Detection ───────────────────────────────────────────
// In production, replace this with your real ML inference endpoint.
async function callDeepfakeAPI(url, mediaType) {
  // Simulate network latency (200–600 ms)
  await new Promise(r => setTimeout(r, 200 + Math.random() * 400));

  // Deterministic-ish result based on URL hash so results stay stable per URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }

  const seed = (hash % 100) / 100; // 0.00 – 0.99

  let verdict, confidence, reasons;

  if (seed < 0.30) {
    // REAL
    verdict = 'real';
    confidence = Math.round(85 + seed * 40);
    reasons = ['Natural lighting patterns', 'Consistent facial geometry', 'Authentic pixel distribution'];
  } else if (seed < 0.60) {
    // FAKE
    verdict = 'fake';
    confidence = Math.round(72 + seed * 28);
    const fakeReasons = [
      ['Face distortion detected', 'GAN artifact patterns', 'Unnatural blinking frequency'],
      ['Lighting mismatch', 'Edge blurring around face', 'Inconsistent skin texture'],
      ['Background inconsistency', 'Deepfake compression artifacts', 'Temporal flickering'],
      ['Eye reflection anomaly', 'Hair boundary artifacts', 'Facial asymmetry'],
    ];
    reasons = fakeReasons[hash % fakeReasons.length];
  } else {
    // SUSPICIOUS
    verdict = 'suspicious';
    confidence = Math.round(40 + seed * 35);
    reasons = ['Low resolution prevents accurate analysis', 'Partial face visibility', 'Ambiguous compression artifacts'];
  }

  return {
    verdict,           // 'real' | 'fake' | 'suspicious'
    confidence,        // integer 0–100
    reasons,           // string[]
    mediaType,         // 'image' | 'video'
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {

    // Content script requests analysis of a media URL
    case 'ANALYZE_MEDIA': {
      callDeepfakeAPI(message.url, message.mediaType)
        .then(result => {
          // Update tab stats
          if (!tabState[tabId]) tabState[tabId] = { enabled: true, stats: { scanned: 0, fake: 0, suspicious: 0 } };
          tabState[tabId].stats.scanned++;
          if (result.verdict === 'fake')       tabState[tabId].stats.fake++;
          if (result.verdict === 'suspicious') tabState[tabId].stats.suspicious++;

          sendResponse({ success: true, result });
        })
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // keep channel open for async response
    }

    // Popup requests current tab stats
    case 'GET_STATS': {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        const id = tab?.id;
        const state = tabState[id] ?? { enabled: true, stats: { scanned: 0, fake: 0, suspicious: 0 } };
        sendResponse({ success: true, state });
      });
      return true;
    }

    // Popup toggles detection on/off
    case 'TOGGLE_DETECTION': {
      if (!tabState[tabId]) tabState[tabId] = { enabled: true, stats: { scanned: 0, fake: 0, suspicious: 0 } };
      tabState[tabId].enabled = message.enabled;
      sendResponse({ success: true });
      return true;
    }

    // Popup requests reset of stats for active tab
    case 'RESET_STATS': {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        const id = tab?.id;
        if (id) tabState[id] = { enabled: true, stats: { scanned: 0, fake: 0, suspicious: 0 } };
        sendResponse({ success: true });
      });
      return true;
    }

    // Check if detection is enabled for this tab
    case 'IS_ENABLED': {
      const state = tabState[tabId];
      sendResponse({ enabled: state ? state.enabled : true });
      return true;
    }
  }
});

// Clean up state when tab closes
chrome.tabs.onRemoved.addListener(tabId => {
  delete tabState[tabId];
});
