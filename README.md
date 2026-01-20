# 🚀 RoTrade - Smart Roblox Trading Extension

<div align="center">

**Smart Roblox trading made simple. Craft your perfect trade and let our algorithm find the best trading partners automatically.**

[![Version](https://img.shields.io/badge/version-1.2.8-brightgreen)](manifest.json)
[![Manifest](https://img.shields.io/badge/manifest-v3-blue)](manifest.json)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-lightgrey)](LICENSE)

[🌐 Visit Website](https://roautotrade.com) • [📖 Documentation](#features) • [🐛 Report Issues](#support)

</div>

---

## ✨ Features

### 🎯 **Auto-Trading System**
- **Smart Algorithm**: Automatically finds the best trading partners
- **Trade Matching**: Intelligent pairing based on item preferences
- **Real-time Monitoring**: Continuous tracking of trade opportunities

### 🎮 **Seamless Integration**
- **Native Roblox UI**: Blends perfectly with Roblox interface
- **Dashboard Access**: Quick access to your auto-trades
- **One-Click Setup**: Easy configuration and management

### 🔒 **Safe & Secure**
- **No Storage Permissions**: Minimal permissions for maximum privacy
- **Active Tab Only**: Only accesses current Roblox tab
- **Secure API**: Protected communication with RoTrade servers

---

## 🚀 Quick Start

### Installation
1. Download the extension files
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Navigate to [Roblox](https://www.roblox.com) and start trading!

### First Use
1. Click the RoTrade extension icon
2. Click **"Open Dashboard"** to access your auto-trades
3. Set up your trading preferences
4. Let the algorithm do the work!

---

## 📱 Extension Popup

The extension popup provides quick access to:

- **🚀 Open Dashboard**: Access your auto-trades directly
- **🌐 Visit Website**: Learn more about RoTrade
- **📊 Version Info**: Always shows current version from manifest

---

## 🛠️ Technical Details

### Permissions
- `activeTab`: Access to current Roblox tab only
- No storage permissions required

### Host Permissions
- `www.roblox.com/*`: Main Roblox website
- `api.rolimons.com/*`: Item value data
- `roautotrade.com/*`: RoTrade API
- `users.roblox.com/*`: User profile data
- `inventory.roblox.com/*`: User inventory access
- `thumbnails.roblox.com/*`: Item thumbnails
- `auth.roblox.com/*`: Authentication
- `trades.roblox.com/*`: Trading interface

### Files Structure


```
rotrade/
├── manifest.json           # Extension configuration
├── LICENSE                 # License file
├── README.md               # This file
│
├── assets/                 # Static assets
│   ├── bridge.js           # Angular integration bridge
│   ├── icon.png            # Extension icon
│   ├── notification.mp3    # Notification sound
│   └── styles.css          # Global styles
│
├── background/             # Service worker & handlers
│   ├── background.js       # Main service worker entry
│   ├── cache.js            # Cache definitions
│   └── handlers/           # API request handlers
│       ├── common-owners.js
│       ├── player-assets.js
│       ├── proofs.js
│       ├── rolimons.js
│       ├── thumbnails.js
│       ├── trade.js
│       └── user.js
│
├── content/                # Content script modules
│   ├── init.js             # Initialization logic
│   ├── filters.js          # Trade filtering
│   ├── global-exports.js   # Global function exports
│   ├── item-selectors.js   # Item selection handling
│   ├── margins.js          # Container margin management
│   ├── migration.js        # Data migration utilities
│   ├── pagination-wrappers.js
│   ├── responsive.js       # Responsive layout handling
│   ├── robux-validation.js
│   ├── routing-wrappers.js
│   ├── send-trades-listeners.js
│   ├── styles.js           # Style injection
│   ├── trade-editor.js     # Trade editing logic
│   └── trade-history.js    # Trade history management
│
├── core/                   # Core utilities
│   ├── api.js              # API communication
│   ├── bridge-utils.js     # Bridge utility functions
│   ├── dom.js              # DOM manipulation utilities
│   ├── storage.js          # Local storage management
│   ├── utils.js            # Main utils wrapper
│   └── utils/              # Utility modules
│       ├── cache.js        # Caching utilities
│       ├── logger.js       # Logging utilities
│       ├── network.js      # Network request utilities
│       ├── retry.js        # Retry logic utilities
│       ├── timing.js       # Timing utilities (debounce, throttle)
│       └── validation.js   # Data validation utilities
│
├── proofs/                 # Proofs link functionality
│   ├── proofs-link.js      # Main proofs link module
│   ├── proofs-link-config.js
│   ├── proofs-link-dom.js
│   ├── proofs-link-extractor.js
│   └── proofs-link-validation.js
│
├── trading/                # Trading functionality
│   ├── inventory.js        # Inventory management
│   ├── trades.js           # Trade management
│   ├── trade-display.js    # Trade display wrapper
│   ├── trade-loading.js    # Trade loading wrapper
│   ├── trade-operations.js # Trade operations
│   ├── trade-sending.js    # Trade sending logic
│   ├── trade-status.js     # Trade status wrapper
│   ├── trade-summary.js    # Trade summary calculations
│   ├── opportunities.js    # Opportunities wrapper
│   ├── display/            # Display modules
│   │   ├── actions.js      # Auto-trade actions
│   │   ├── auto-trades.js  # Auto-trades display
│   │   ├── opportunities.js # Opportunities display
│   │   └── trades.js       # Trades display
│   ├── loading/            # Loading modules
│   │   ├── auto-trades.js
│   │   ├── finalized.js
│   │   ├── outbound.js
│   │   ├── thumbnails.js
│   │   └── utils.js
│   ├── opportunities/      # Opportunities modules
│   │   ├── filtering.js
│   │   ├── items.js
│   │   ├── loader.js
│   │   ├── shuffle.js
│   │   ├── sorting.js
│   │   └── users.js
│   └── status/             # Status monitoring modules
│       ├── checker.js
│       ├── cleanup.js
│       ├── fetcher.js
│       ├── monitoring.js
│       ├── notifications.js
│       ├── roblox.js
│       └── trades.js
│
└── ui/                     # UI components
    ├── dialogs.js          # Dialog management
    ├── event-listeners.js  # Event listeners wrapper
    ├── pagination.js       # Pagination logic
    ├── popup.html          # Extension popup HTML
    ├── popup.js            # Popup functionality
    ├── popup.css           # Popup styling
    ├── routing.js          # Page routing
    ├── thumbnails.js       # Thumbnail handling
    ├── ui.js               # UI utilities
    ├── user-stats.js       # User statistics
    ├── pages.js            # Pages wrapper
    ├── listeners/          # Event listener modules
    │   ├── auto-trades.js
    │   ├── create-trade.js
    │   ├── send-trades.js
    │   └── settings.js
    └── pages/              # Page modules
        ├── auto-trades.js
        ├── create-trade.js
        ├── proofs.js
        ├── send-trades.js
        ├── settings.js
        └── utils.js
```

---

## 🎨 Styling & UI

RoTrade features a modern, dark-themed interface that integrates seamlessly with Roblox:

- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: Polished user experience
- **Consistent Branding**: Professional green accent colors
- **Accessibility**: Clear typography and intuitive navigation


## 👥 Credits

<table>
<tr>
<td align="center">
<strong>Frontend Developer</strong><br>
<code>xolo</code><br>
<em>Extension Development</em>
</td>
<td align="center">
<strong>Backend Developer</strong><br>
<code>xolo</code><br>
<em>RoTrade API</em>
</td>
</tr>
</table>

---

## 🔗 Links

- **🌐 Official Website**: [roautotrade.com](https://roautotrade.com)
- **📧 Support**: Contact via [discord](https://discord.gg/XHevWax8q9)
- **🐛 Issues**: Report through [discord](https://discord.gg/XHevWax8q9)
- **📱 Updates**: Automatic through browser

---

## 📄 License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). See the LICENSE file for details.

[CC BY-NC 4.0 Legal Code](https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt)

---

<div align="center">

**Made with ❤️ for the Roblox trading community**

*RoTrade v1.2.8 - Smart Roblox Trading Made Simple*

</div>
