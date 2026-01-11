# 🥊 Boxing Game - First Person 3D with AI Depth Sensing

A browser-based first-person boxing game that uses your webcam and AI-powered hand tracking to control 3D boxing gloves. Punch forward in real life and watch your virtual gloves punch in the game!

## Features

- **First Person 3D View**: Immersive Three.js rendering with boxing gloves in front of you
- **AI Depth Sensing**: Tracks forward/backward hand movement using MediaPipe + scale estimation
- **Forward Punch Detection**: Punch forward with your real hands to trigger in-game punches
- **Real-time Hand Tracking**: MediaPipe Hands for accurate hand position detection
- **Punch Power Calculation**: Faster punches = more powerful in-game effects
- **Mixamo Model Support**: Load custom 3D character models from Mixamo

## How It Works

### Depth Sensing Technology

The game uses multiple techniques to estimate hand depth without specialized depth cameras:

1. **MediaPipe Z-Coordinates**: Each hand landmark includes a relative z-coordinate
2. **Hand Scale Estimation**: Hands appear larger when closer to the camera
3. **Velocity Tracking**: Monitors the rate of depth change to detect punches

### Punch Detection Algorithm

```
1. Track hand depth over multiple frames
2. Calculate velocity (change in depth per frame)
3. Detect forward motion (negative velocity = moving toward camera)
4. Trigger punch when velocity exceeds threshold
5. Calculate punch power based on maximum velocity
```

## Getting Started

### Prerequisites

- Modern web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- Webcam
- Good lighting for hand detection

### Running the Game

1. Clone or download this repository
2. Serve the files using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser
4. Click "Start Camera" and allow camera access
5. Position yourself 2-3 feet from the camera
6. Start punching!

## Controls

| Action | Movement |
|--------|----------|
| Punch | Push your hand forward quickly |
| Move gloves | Move your hands in any direction |
| Adjust height | Raise or lower your hands |

## Depth Indicator Legend

When using the camera, you'll see depth indicators on your tracked hands:

- 🟢 **Green bar/arrow**: Moving forward (punching)
- 🟠 **Orange bar/arrow**: Moving backward
- 🟡 **Yellow ring**: Punch detected!

## Using Mixamo 3D Models

You can replace the procedural boxing gloves with real 3D models from [Mixamo](https://www.mixamo.com):

### Step 1: Get a Model

1. Create a free account at [mixamo.com](https://www.mixamo.com)
2. Browse characters or upload your own
3. Download in **FBX** format (or GLB if available)

### Step 2: Convert to GLB (if needed)

If you downloaded FBX:
1. Visit [gltf.report](https://gltf.report/) or use Blender
2. Import your FBX file
3. Export as GLB format

### Step 3: Load in Game

Place your GLB file in the project folder and use the browser console:

```javascript
// Load custom gloves
BoxingGame3D.setGloveModel('my-boxing-glove.glb');

// Load custom opponent
BoxingGame3D.setOpponentModel('my-opponent.glb');
```

### Recommended Mixamo Assets

- **Boxing Gloves**: Search for "boxing" or "gloves"
- **Opponents**: Any humanoid character
- **Animations**: "Boxing Idle", "Jab", "Hook", "Uppercut"

## File Structure

```
boxing-game/
├── index.html      # Main HTML file
├── styles.css      # Styling
├── game3d.js       # Three.js 3D rendering
├── game.js         # Legacy 2D game (fallback)
├── camera.js       # MediaPipe hand detection
├── depthSensor.js  # AI depth estimation
└── README.md       # This file
```

## Technical Details

### Dependencies (loaded via CDN)

- [Three.js r128](https://threejs.org/) - 3D rendering
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) - Hand tracking
- [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) - 3D model loading

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Edge | ✅ Full |
| Safari | ✅ Full (macOS 11+) |
| Mobile | ⚠️ Limited (performance) |

## API Reference

### BoxingGame3D

```javascript
// Initialize the 3D game
BoxingGame3D.init('containerId');

// Update hand tracking data (called automatically)
BoxingGame3D.updateHandTracking(leftHandData, rightHandData);

// Trigger a punch animation
BoxingGame3D.triggerPunch('left', 0.8); // hand, power (0-1)

// Load custom glove model
BoxingGame3D.setGloveModel('model.glb', 'both'); // 'left', 'right', or 'both'

// Load custom opponent
BoxingGame3D.setOpponentModel('opponent.glb');
```

### DepthSensor

```javascript
// Process MediaPipe results
const depthData = DepthSensor.update(mediapipeResults);

// Get current hand states
const states = DepthSensor.getHandStates();

// Set punch callback
DepthSensor.setOnPunchDetected((punchData) => {
    console.log(punchData.hand, punchData.power);
});

// Get debug information
const debug = DepthSensor.getDebugData();
```

### CameraDetection

```javascript
// Initialize camera detection
await CameraDetection.init();

// Start/stop camera
CameraDetection.startCamera();
CameraDetection.stopCamera();

// Set callbacks
CameraDetection.setOnPunchDetected(callback);
CameraDetection.setOnStanceDetected(callback);
```

## Troubleshooting

### Camera not working
- Ensure you've granted camera permissions
- Check if another application is using the camera
- Try refreshing the page

### Hands not detected
- Improve lighting conditions
- Keep hands in frame and visible
- Maintain 2-3 feet distance from camera

### Punches not registering
- Make faster, more deliberate forward motions
- Ensure your full hand is visible
- Try calibrating in different lighting

### 3D view not loading
- Check browser console for errors
- Ensure WebGL is enabled
- Try a different browser

## Performance Tips

1. **Lighting**: Good, even lighting improves hand detection
2. **Background**: Plain backgrounds work better
3. **Distance**: Stay 2-3 feet from camera
4. **Clothing**: Avoid gloves or long sleeves covering hands
5. **Browser**: Chrome typically has best WebGL performance

## License

MIT License - Feel free to use and modify for your projects!

## Credits

- [MediaPipe](https://mediapipe.dev/) by Google for hand tracking
- [Three.js](https://threejs.org/) for 3D rendering
- [Mixamo](https://www.mixamo.com/) by Adobe for 3D character resources
