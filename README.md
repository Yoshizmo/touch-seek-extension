# Touch Video Seek Extension

A browser extension for Microsoft Edge and Google Chrome that adds touch-friendly seek buttons to videos, allowing you to easily skip forward or backward by 5 seconds without needing a keyboard.

## Features

- Adds touch-friendly overlay buttons to all videos on web pages
- Skip forward/backward by 5 seconds with a single tap
- Works with full-screen videos
- Perfect for touchscreen devices like Microsoft Surface
- Compatible with YouTube, Twitch, and other video sites
- Automatically hides when not in use

## Installation

### Google Chrome

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension folder
5. The extension should now be installed and active

### Microsoft Edge

1. Download or clone this repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable "Developer mode" (toggle in the left sidebar)
4. Click "Load unpacked" and select the extension folder
5. The extension should now be installed and active

## Usage

- Play any video on a website
- Two buttons will appear as an overlay on the video
- Tap the left button to go back 5 seconds
- Tap the right button to go forward 5 seconds
- The overlay will automatically hide after a few seconds of inactivity
- Move your cursor over the video to show the overlay again

## Customization

You can modify the following settings in `js/content.js`:

- `SEEK_TIME`: Change the number of seconds to seek (default: 5)
- `OVERLAY_HIDE_TIMEOUT`: Change how long the overlay stays visible (default: 3000ms)
- `OVERLAY_SHOW_ON_HOVER`: Toggle whether overlay shows on mouse hover (default: true)

## License

MIT
