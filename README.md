# 🔍 TruthLens – Deepfake Detection Chrome Extension

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green.svg)
![Status](https://img.shields.io/badge/status-Prototype-orange.svg)
![Made With](https://img.shields.io/badge/Made%20with-Vanilla%20JS-yellow.svg)

> ⚖️ **For educational and ethical use only**

A Chrome Extension (Manifest V3) that automatically scans all images and videos on any webpage in **real-time** and detects whether media is **real**, **deepfake/AI-generated**, or **suspicious** — with visual confidence scores and explanations.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Auto-scan** | Detects all `<img>` and `<video>` elements automatically on page load |
| 🎨 **Color-coded borders** | 🟢 Green = Real · 🔴 Red = Deepfake · 🟡 Yellow = Suspicious |
| 📊 **Confidence badge** | Shows verdict + confidence % on every media element |
| 💬 **Tooltip explanation** | "Why this is fake" with detailed reasons (face distortion, GAN artifacts, etc.) |
| 📈 **Live dashboard** | Popup shows total scanned, fake count, suspicious count, and Page Risk Level |
| 🔄 **Real-time scroll scanning** | New images loaded while scrolling are detected instantly via `MutationObserver` |
| ⚡ **ON/OFF toggle** | Pause and resume detection at any time from the popup |
| 🚨 **Warning banner** | Red alert banner injected at top of page when multiple fakes are detected |
| ↺ **Rescan button** | Force re-scan the entire page from the popup |

---

## 📸 Screenshots

### Extension Popup Dashboard
The popup shows real-time stats — total media scanned, deepfakes found, suspicious content, and overall Page Risk Level.

### Content Overlay Example
Each image gets:
- A **colored border** indicating verdict
- A **floating badge** like `🚨 Deepfake – 89%` or `✅ Real – 94%`
- On hover: a **tooltip** explaining why it was flagged

---

## 📁 Project Structure

```
TruthLens/
├── manifest.json          ← Chrome Extension Manifest V3
├── background.js          ← Service worker: API calls & tab state
├── content.js             ← DOM scanner: finds img/video, renders overlays
├── content.css            ← Injected styles: badges, borders, tooltip, banner
├── popup.html             ← Extension popup dashboard
├── popup.css              ← Popup styling (dark premium UI)
├── popup.js               ← Popup logic: stats, toggle, rescan
├── preview.html           ← Standalone hackathon demo page (no install needed)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation

### Load in Chrome (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/Malik10208/deepfake.git
   cd deepfake
   ```

2. Open **Google Chrome** and go to:
   ```
   chrome://extensions
   ```

3. Enable **Developer Mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** and select the cloned `deepfake` folder

5. The TruthLens 🔍 icon will appear in your Chrome toolbar

6. Visit any webpage (e.g. `https://www.bbc.com/news`) — scanning starts automatically!

---

## 🎯 How It Works

```
Webpage visited by user
    └── content.js injected automatically
            │
            ├── Finds all <img> and <video> elements
            ├── Filters by minimum size (80×80px)
            ├── Shows blue scan sweep animation
            ├── Sends media URL → background.js
            └── Renders verdict border + badge on result
                    │
            background.js (Service Worker)
                    │
                    ├── callDeepfakeAPI(url, mediaType)
                    │       ↑ Replace with real ML endpoint
                    ├── Tracks per-tab statistics
                    └── Returns { verdict, confidence, reasons }
                    │
            popup.js + popup.html
                    └── Live stats refresh every 1.5s
```

---

## 🔌 Connecting a Real ML Backend

Replace the `callDeepfakeAPI` function in `background.js`:

```javascript
async function callDeepfakeAPI(url, mediaType) {
  const response = await fetch('https://your-ml-api.com/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, mediaType })
  });
  return await response.json();
  // Expected response format:
  // {
  //   verdict: 'real' | 'fake' | 'suspicious',
  //   confidence: 0-100,
  //   reasons: string[]
  // }
}
```

Recommended ML backends:
- [FaceForensics++](https://github.com/ondyari/FaceForensics) — face manipulation detection
- [DeepFake-o-meter](https://github.com/yuezunli/deepfake-o-meter) — multiple detector ensemble
- Custom model deployed on AWS Lambda / Google Cloud Functions / FastAPI

---

## 🛠️ Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (no frameworks, no dependencies)
- **Vanilla CSS** with modern design (glassmorphism, animations)
- **MutationObserver API** for real-time DOM monitoring
- **Chrome Scripting API** for dynamic re-injection
- **Chrome Storage & Tabs APIs** for state management

---

## 🏆 Hackathon Demo Tips

1. Open `preview.html` directly in Chrome for a **zero-install demo** of the UI
2. Load the extension and visit **Google Images** — lots of faces = dramatic demo
3. The mock API uses **URL hashing** so the same image always gets the same verdict (stable demo)
4. Toggle detection **OFF and ON** in the popup to show the reset effect

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

## ⚖️ Disclaimer

This extension is built **for educational and ethical purposes only**. The current version uses a mock detection API. Do not use it to make real-world decisions about the authenticity of media. Always verify through professional forensic tools.

---

*Built with ❤️ using Chrome Extension Manifest V3 · Zero external dependencies*
