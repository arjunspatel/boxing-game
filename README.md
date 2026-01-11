# 🥊 Camera-Based Boxing Game

A motion-controlled boxing game that uses MediaPipe to detect player hand movements and control a boxer avatar in real-time.

## How to Run

1. Open `index.html` in your browser (Chrome recommended)
2. Click **"Start Camera"** to enable webcam access
3. Stand back so the camera can see both your hands
4. Move your hands to control the boxer!

> **Note:** You need to allow camera permissions when prompted. The game works best with good lighting and a clear background.

## Current Features

### Placeholder Graphics
- **Boxer Avatar**: Viewed from behind (facing away from player), drawn with canvas
- **9 Different Stances**: Each with unique arm/glove positions
- **Boxing Ring**: Perspective floor with ropes and mat
- **Interactive Demo**: Click buttons or use keyboard to preview stances

### Stances Available

| Stance | Description | Grid Detection |
|--------|-------------|----------------|
| **Idle** | Relaxed stance, gloves down | No gloves detected in key positions |
| **Guard Up** | Both gloves protecting face | Both gloves in top row |
| **Left Jab** | Left arm extended forward | Left glove top-right |
| **Right Jab** | Right arm extended forward | Right glove top-left |
| **Left Hook** | Left arm swinging wide | Left glove middle-left |
| **Right Hook** | Right arm swinging wide | Right glove middle-right |
| **Duck Left** | Crouch and lean left | Left glove bottom-left |
| **Duck Right** | Crouch and lean right | Right glove bottom-right |
| **Block Body** | Gloves protecting torso | Gloves in middle row |

## 2x3 Detection Grid System

The camera feed is divided into a 2x3 grid to detect glove positions:

```
┌─────────┬─────────┐
│ Top-Left│Top-Right│  ← High guard / Punching
├─────────┼─────────┤
│ Mid-Left│Mid-Right│  ← Hooks / Body protection
├─────────┼─────────┤
│ Bot-Left│Bot-Right│  ← Ducking / Low position
└─────────┴─────────┘
```

### Detection Logic

1. **Guard Position**: Both gloves detected in top row → Guard Up
2. **Jabs**: One glove moves across to opposite top corner → Jab (cross punch)
3. **Hooks**: Glove in middle side cell → Hook punch
4. **Ducking**: Glove drops to bottom row → Duck in that direction
5. **Body Block**: Both gloves in middle row → Protecting body

## Controls (Demo Mode)

### Keyboard Shortcuts
- `1` - Idle
- `2` - Guard Up
- `Q` - Left Jab
- `E` - Right Jab
- `A` - Left Hook
- `D` - Right Hook
- `Z` - Duck Left
- `C` - Duck Right
- `S` - Block Body

### Grid Interaction
- **Click** a grid cell to place the left glove (red)
- **Shift+Click** to place the right glove (cyan)
- The stance will automatically update based on glove positions

## Technology

### MediaPipe Hands
The game uses [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) - a free, open-source hand tracking solution from Google that runs entirely in the browser.

- **Real-time tracking** of up to 2 hands
- **21 landmarks per hand** for precise detection
- **No server required** - all processing happens locally
- **Works on most modern devices** with a webcam

### How Detection Works
1. Camera feed is captured via WebRTC
2. MediaPipe processes each frame to detect hands
3. Hand positions are mapped to the 2x3 grid
4. Grid positions determine which stance to display
5. Boxer avatar updates in real-time

## Planned Features

- [x] MediaPipe integration for real-time hand tracking
- [ ] Opponent boxer AI
- [ ] Health bars and scoring system
- [ ] Punch impact animations
- [ ] Sound effects
- [ ] Match rounds and timer
- [ ] Different boxer characters/skins

## Technical Details

### Color Scheme
- **Left Glove**: Red (#e94560)
- **Right Glove**: Cyan (#4ecdc4)
- **Ring Mat**: Blue (#4a90a4)
- **Arena**: Dark blue gradient

### Architecture (Planned)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Camera Feed   │────▶│  MediaPipe Hand  │────▶│  Grid Position  │
│   (WebRTC)      │     │   Tracking       │     │   Calculator    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Game Renderer  │◀────│  Stance State    │◀────│  Stance Mapper  │
│   (Canvas)      │     │   Machine        │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Browser Support

Tested on modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Open source - feel free to use and modify!
