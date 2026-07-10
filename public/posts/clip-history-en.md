---
id: "clip-history-en"
title: "ClipHistory: Open Source Clipboard Manager for macOS with Persistent History"
summary: "ClipHistory is an open source clipboard history manager for macOS. Press Shift+Cmd+V for a searchable history of text, images and files. SQLite persistent, no network connections, MIT licensed."
createdAt: "2026-07-10 13:00:00"
imageUrl: "images/clip-history.png"
tags: "macOS, Clipboard Manager, Open Source, Swift, SwiftUI, Menu Bar App, Clipboard History, Productivity, MIT, Mac App"
keywords: "macOS clipboard manager, clipboard history macOS, open source clipboard app, free clipboard manager Mac, Shift Cmd V clipboard, clipboard history tool, Swift clipboard app, menu bar clipboard"
language: "en"
translationGroup: "clip-history"
---

# ClipHistory: Open Source Clipboard Manager for macOS with Persistent History

**ClipHistory** is an **open source clipboard history manager for macOS**. Press Shift+Cmd+V from any app to access a searchable history of text, images, and files. SQLite persistent, no network connections, MIT licensed.

**[👉 Visit ClipHistory](https://banegasn.github.io/clip-history/)** — Explore all features, download the .dmg, or review the source code on GitHub.

---

## The macOS clipboard problem

macOS only remembers **one thing** at a time in the clipboard. Copy something new and the previous item is gone forever. If you work copying and pasting text fragments, links, images, or code, this means wasting time switching back and forth between apps.

**ClipHistory** solves this elegantly: press **Shift+Cmd+V** from any app and a searchable panel appears with everything you've recently copied. Select, hit Enter, and it pastes right where you were.

---

## Key features

**Global hotkey** — **Shift+Cmd+V** opens a centered, searchable panel from any app. No need to switch windows or hunt for a menu bar icon.

**Text, images & files** — Captures plain text and rich text, screenshots and images you've copied, and files copied from Finder.

**Persistent with SQLite** — History is stored in a SQLite database in Application Support. It survives reboots. Capped at the **200 most recent items** to stay lightweight.

**Paste in place** — Select a clip with **Enter** and ClipHistory re-activates the previous app and pastes with a synthetic **Cmd+V**. No manual pasting needed.

**Pin your favorites** — Pin clips with **Cmd+P** and they stick to the top. Pinned clips **are never evicted** by the 200-item cap. **Cmd+Backspace** deletes, **right arrow** expands full content.

**Private by design** — ClipHistory **makes no network connections**. Everything stays local. It also **automatically detects and skips** clips from password managers so your credentials never end up in history.

<div style="text-align: center; margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px;">
  <h2 style="margin-bottom: 1rem; color: #f8fafc; font-size: 1.4rem;">Press Shift+Cmd+V and paste anything</h2>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="https://banegasn.github.io/clip-history/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;">
      🚀 Visit ClipHistory
    </a>
    <a href="https://github.com/banegasn/clip-history/releases/latest" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1f2937; color: #f8fafc; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #374151;">
      ⬇️ Download .dmg
    </a>
    <a href="https://github.com/banegasn/clip-history" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: transparent; color: #7dd3fc; padding: 1.2rem 2rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; border: 1px solid #374151;">
      ★ View source on GitHub
    </a>
  </div>
  <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">Free & MIT-licensed · macOS 14+ · ~380 KB</p>
</div>

---

## Built for your hands

| Shortcut | Action |
|----------|--------|
| **Shift+Cmd+V** | Open / focus the history panel |
| **↑ ↓** | Move the selection |
| **→** | Expand a clip's full content |
| **← / Esc** | Back from detail · dismiss the panel |
| **Enter** | Paste the selection into the previous app |
| **Option+↑ / Option+↓** | Jump 5 rows at a time |
| **Cmd+P** | Pin / unpin — favorites float to the top |
| **Cmd+Backspace** | Delete the selected entry from history |
| **Type** | Filter the history |

---

## Installation in a minute

**1. Download & drag to Applications** — Grab the [latest .dmg](https://github.com/banegasn/clip-history/releases/latest), open it, and drag **ClipHistory** into Applications.

**2. Open it the first time** — It isn't notarized by Apple, so open **System Settings ▸ Privacy & Security** and click **Open Anyway** (or run `xattr -dr com.apple.quarantine /Applications/ClipHistory.app` in Terminal).

**3. Grant Accessibility** — **System Settings ▸ Privacy & Security ▸ Accessibility** → enable ClipHistory. Needed so it can paste with Cmd+V.

---

## How it works under the hood

- **Copy detection** — Polls `NSPasteboard.changeCount` (macOS has no clipboard-change event)
- **Global shortcut** — Carbon `RegisterEventHotKey` (system-wide, no special permissions)
- **Paste back** — Re-activates the prior app, then posts a synthetic Cmd+V via `CGEvent`
- **Storage** — SQLite in Application Support; images as PNG blobs, thumbnails in memory

---

## Why choose ClipHistory

- **Free and open source** (MIT license)
- **~380 KB** — a tiny app that doesn't weigh down your system
- **No network connections** — your clipboard never leaves your Mac
- **SQLite persistent** — history survives reboots
- **Built with Swift and SwiftUI** — native macOS

---

## Frequently asked questions

**Is ClipHistory free?**
Yes, it's completely free and open source under the MIT license. You can use, modify, and distribute it freely.

**Does ClipHistory send data to the internet?**
No. ClipHistory **makes no network connections**. All history is stored locally on your Mac.

**Does it work with password managers?**
Yes, ClipHistory automatically detects and skips clips from password managers like 1Password, Bitwarden, or the macOS Keychain.

**What macOS version do I need?**
ClipHistory requires **macOS 14 (Sonoma)** or later.

**Is it notarized by Apple?**
No, so you'll need to click "Open Anyway" in Privacy & Security the first time, or run the `xattr` command above.

**Can I build it from source?**
Yes, run `./setup-signing.sh && ./build-app.sh`. See the [README on GitHub](https://github.com/banegasn/clip-history#readme) for details.

---

## Links

- **[ClipHistory website](https://banegasn.github.io/clip-history/)** — Explore all features
- **[Download .dmg](https://github.com/banegasn/clip-history/releases/latest)** — Latest release
- **[Source code on GitHub](https://github.com/banegasn/clip-history)** — Star, contribute, and inspect
- **[Report issues](https://github.com/banegasn/clip-history/issues)** — Help improve the app
