# 🥊 Camera-Based Boxing Game

A motion-controlled boxing game that uses MediaPipe (or similar tools) to detect player movements and control a boxer avatar.

## How to Run

Open `index.html` in your browser to see the placeholder graphics demo.

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

## Planned Features

- [ ] MediaPipe integration for real-time hand tracking
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
