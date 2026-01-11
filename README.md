# 🥊 Camera-Based Boxing Game

A motion-controlled boxing game that uses MediaPipe Hands to detect player movements and control a boxer avatar in real-time.

## How to Run

1. Open `index.html` in a modern web browser (Chrome recommended)
2. Click "Start Camera" to enable camera detection
3. Allow camera access when prompted
4. Move your hands to control the boxer!

**Note:** You need to serve the files over HTTP/HTTPS for camera access to work. You can use:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```
Then open `http://localhost:8000` in your browser.

## Project Structure

```
├── index.html    # Main HTML page
├── styles.css    # All styling
├── game.js       # Boxer rendering and game logic
├── camera.js     # MediaPipe hand detection
└── README.md     # This file
```

## Features

### Camera-Based Detection
- **Real-time hand tracking** using MediaPipe Hands
- **2x3 grid detection** system for intuitive controls
- **Visual feedback** showing detected hand positions
- **Mirror display** so movements feel natural

### Boxer Avatar
- **Viewed from behind** (facing away from player)
- **13 different stances** with smooth transitions
- **Canvas-based rendering** with detailed graphics
- **Boxing ring** with perspective floor, ropes, and mat

## How to Play

| Hand Position | Boxer Action |
|---------------|--------------|
| Both hands up (top row) | Guard position |
| Both hands top-left | Guard + move left |
| Both hands top-right | Guard + move right |
| Left hand up only | Left Jab punch |
| Right hand up only | Right Jab punch |
| Left hand middle-left | Left Hook |
| Right hand middle-right | Right Hook |
| Both hands middle | Block Body |
| Both hands bottom | Duck |
| No hands detected | Idle stance |

## 2x3 Detection Grid System

The camera feed is divided into a 2x3 grid to detect hand positions:

```
┌─────────┬─────────┐
│ Top-Left│Top-Right│  ← High guard / Punching
├─────────┼─────────┤
│ Mid-Left│Mid-Right│  ← Hooks / Body protection
├─────────┼─────────┤
│ Bot-Left│Bot-Right│  ← Ducking / Low position
└─────────┴─────────┘
```

**Color coding:**
- **Red highlight** = Left hand detected in that cell
- **Cyan highlight** = Right hand detected in that cell

## Technical Details

### Dependencies
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) - Hand tracking (loaded via CDN)

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Camera Feed   │────▶│  MediaPipe Hand  │────▶│  Grid Position  │
│   (WebRTC)      │     │   Tracking       │     │   Calculator    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Game Renderer  │◀────│  Stance State    │◀────│  Stance Mapper  │
│   (Canvas)      │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Color Scheme
- **Left Hand/Glove**: Red (#e94560)
- **Right Hand/Glove**: Cyan (#4ecdc4)
- **Ring Mat**: Blue (#4a90a4)
- **Arena**: Dark blue gradient

## Browser Support

Requires WebRTC camera access:
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## Tips for Best Detection

1. **Lighting**: Ensure good, even lighting on your hands
2. **Background**: A plain background helps detection accuracy
3. **Distance**: Stand 2-3 feet from your camera
4. **Visibility**: Keep both hands visible in frame
5. **Gloves**: Wearing actual boxing gloves can help visibility!

## Future Plans

- [ ] Opponent boxer AI
- [ ] Health bars and scoring system
- [ ] Punch impact animations
- [ ] Sound effects
- [ ] Match rounds and timer
- [ ] Different boxer characters/skins
- [ ] Uppercut detection (vertical hand movement)

## License

Open source - feel free to use and modify!
