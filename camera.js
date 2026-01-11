// Camera Detection using MediaPipe Hands

const CameraDetection = (function() {
    let video, canvasOverlay, ctxOverlay;
    let hands = null;
    let camera = null;
    let isRunning = false;
    let onStanceDetected = null;
    
    // Grid configuration: 2 columns (left/right), 3 rows (top/middle/bottom)
    const GRID_COLS = 2;
    const GRID_ROWS = 3;
    
    // Hand positions in grid
    let leftHandGrid = null;  // { row: 0-2, col: 0-1 }
    let rightHandGrid = null;
    
    // Grid cell elements for visual feedback
    let gridCells = [];
    
    // Initialize MediaPipe Hands
    async function initMediaPipe() {
        const statusEl = document.getElementById('cameraStatus');
        if (statusEl) {
            statusEl.textContent = 'Loading MediaPipe...';
            statusEl.className = 'camera-status';
        }
        
        try {
            // Load MediaPipe Hands
            hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });
            
            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            hands.onResults(onResults);
            
            if (statusEl) {
                statusEl.textContent = 'MediaPipe ready. Click Start Camera.';
            }
            
            return true;
        } catch (error) {
            console.error('Error loading MediaPipe:', error);
            if (statusEl) {
                statusEl.textContent = 'Error loading MediaPipe: ' + error.message;
                statusEl.className = 'camera-status error';
            }
            return false;
        }
    }
    
    // Start the camera
    async function startCamera() {
        const statusEl = document.getElementById('cameraStatus');
        const startBtn = document.getElementById('startBtn');
        
        if (startBtn) startBtn.disabled = true;
        
        if (statusEl) {
            statusEl.textContent = 'Starting camera...';
            statusEl.className = 'camera-status';
        }
        
        try {
            video = document.getElementById('cameraFeed');
            canvasOverlay = document.getElementById('cameraOverlay');
            
            if (canvasOverlay) {
                ctxOverlay = canvasOverlay.getContext('2d');
            }
            
            // Get camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: 320, 
                    height: 240,
                    facingMode: 'user'
                }
            });
            
            video.srcObject = stream;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            // Set canvas size to match video
            if (canvasOverlay) {
                canvasOverlay.width = video.videoWidth || 320;
                canvasOverlay.height = video.videoHeight || 240;
            }
            
            isRunning = true;
            
            if (statusEl) {
                statusEl.textContent = 'Camera active - detecting hands...';
                statusEl.className = 'camera-status active';
            }
            
            // Re-enable button and update text so user can stop the camera
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Stop Camera';
            }
            
            // Start detection loop
            detectLoop();
            
        } catch (error) {
            console.error('Error starting camera:', error);
            if (statusEl) {
                statusEl.textContent = 'Camera error: ' + error.message;
                statusEl.className = 'camera-status error';
            }
            if (startBtn) startBtn.disabled = false;
        }
    }
    
    // Detection loop
    async function detectLoop() {
        if (!isRunning || !hands || !video) return;
        
        if (video.readyState >= 2) {
            await hands.send({ image: video });
        }
        
        requestAnimationFrame(detectLoop);
    }
    
    // Process MediaPipe results
    function onResults(results) {
        // Clear overlay
        if (ctxOverlay && canvasOverlay) {
            ctxOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
        }
        
        // Reset grid highlights
        clearGridHighlights();
        
        // Track detected hands
        leftHandGrid = null;
        rightHandGrid = null;
        
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // Get wrist position (landmark 0) as hand position
                // We use wrist as it's more stable
                const wrist = landmarks[0];
                
                // Also consider the middle finger MCP (landmark 9) for better center
                const middleMCP = landmarks[9];
                
                // Average position
                const handX = (wrist.x + middleMCP.x) / 2;
                const handY = (wrist.y + middleMCP.y) / 2;
                
                // Convert to grid position
                // Note: x is mirrored because video is mirrored
                const gridCol = handX < 0.5 ? 1 : 0;  // Mirrored: left half = right column
                const gridRow = Math.floor(handY * GRID_ROWS);
                const clampedRow = Math.max(0, Math.min(GRID_ROWS - 1, gridRow));
                
                const gridPos = { row: clampedRow, col: gridCol };
                
                // MediaPipe returns "Left" or "Right" from camera perspective
                // Since video is mirrored, we need to swap
                const isLeftHand = handedness.label === 'Right';  // Mirrored
                
                if (isLeftHand) {
                    leftHandGrid = gridPos;
                } else {
                    rightHandGrid = gridPos;
                }
                
                // Draw hand landmarks on overlay
                if (ctxOverlay) {
                    drawHandLandmarks(landmarks, isLeftHand);
                }
            }
        }
        
        // Update grid highlights
        updateGridHighlights();
        
        // Detect stance based on hand positions
        detectStance();
        
        // Update detection info display
        updateDetectionInfo();
    }
    
    // Draw hand landmarks on overlay
    function drawHandLandmarks(landmarks, isLeftHand) {
        if (!ctxOverlay || !canvasOverlay) return;
        
        const color = isLeftHand ? '#e94560' : '#4ecdc4';
        const width = canvasOverlay.width;
        const height = canvasOverlay.height;
        
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],  // Index
            [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
            [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
            [5, 9], [9, 13], [13, 17]  // Palm
        ];
        
        ctxOverlay.strokeStyle = color;
        ctxOverlay.lineWidth = 2;
        
        for (const [i, j] of connections) {
            const start = landmarks[i];
            const end = landmarks[j];
            // Mirror X coordinate
            ctxOverlay.beginPath();
            ctxOverlay.moveTo((1 - start.x) * width, start.y * height);
            ctxOverlay.lineTo((1 - end.x) * width, end.y * height);
            ctxOverlay.stroke();
        }
        
        // Draw landmarks
        ctxOverlay.fillStyle = color;
        for (const landmark of landmarks) {
            ctxOverlay.beginPath();
            // Mirror X coordinate
            ctxOverlay.arc((1 - landmark.x) * width, landmark.y * height, 3, 0, 2 * Math.PI);
            ctxOverlay.fill();
        }
    }
    
    // Clear grid highlights
    function clearGridHighlights() {
        document.querySelectorAll('.grid-cell-overlay').forEach(cell => {
            cell.classList.remove('left-hand', 'right-hand');
        });
    }
    
    // Update grid highlights based on hand positions
    function updateGridHighlights() {
        if (leftHandGrid) {
            const cellIndex = leftHandGrid.row * GRID_COLS + leftHandGrid.col;
            const cell = document.querySelector(`.grid-cell-overlay[data-index="${cellIndex}"]`);
            if (cell) cell.classList.add('left-hand');
        }
        
        if (rightHandGrid) {
            const cellIndex = rightHandGrid.row * GRID_COLS + rightHandGrid.col;
            const cell = document.querySelector(`.grid-cell-overlay[data-index="${cellIndex}"]`);
            if (cell) cell.classList.add('right-hand');
        }
    }
    
    // Update detection info display
    function updateDetectionInfo() {
        const leftPosEl = document.getElementById('leftHandPos');
        const rightPosEl = document.getElementById('rightHandPos');
        
        const rowNames = ['Top', 'Middle', 'Bottom'];
        const colNames = ['Left', 'Right'];
        
        if (leftPosEl) {
            if (leftHandGrid) {
                leftPosEl.textContent = `${rowNames[leftHandGrid.row]} ${colNames[leftHandGrid.col]}`;
            } else {
                leftPosEl.textContent = 'Not detected';
            }
        }
        
        if (rightPosEl) {
            if (rightHandGrid) {
                rightPosEl.textContent = `${rowNames[rightHandGrid.row]} ${colNames[rightHandGrid.col]}`;
            } else {
                rightPosEl.textContent = 'Not detected';
            }
        }
    }
    
    // Detect stance from grid positions
    function detectStance() {
        let stance = 'idle';
        
        const lg = leftHandGrid;
        const rg = rightHandGrid;
        
        // No hands detected
        if (!lg && !rg) {
            stance = 'idle';
        }
        // Both hands detected
        else if (lg && rg) {
            // Both hands in top row = Guard
            if (lg.row === 0 && rg.row === 0) {
                // Both top-left = guard left position
                if (lg.col === 0 && rg.col === 0) {
                    stance = 'guardLeft';
                }
                // Both top-right = guard right position
                else if (lg.col === 1 && rg.col === 1) {
                    stance = 'guardRight';
                }
                // Mixed top = standard guard
                else {
                    stance = 'guard';
                }
            }
            // Both hands in bottom row = duck
            else if (lg.row === 2 && rg.row === 2) {
                if (lg.col === 0 || rg.col === 0) {
                    stance = 'duckLeft';
                } else {
                    stance = 'duckRight';
                }
            }
            // Both hands in middle row = block body
            else if (lg.row === 1 && rg.row === 1) {
                stance = 'blockBody';
            }
            // One hand extended (top), other in middle/guard = punch
            else if (lg.row === 0 && rg.row >= 1) {
                // Left hand up = left jab
                stance = 'jabLeft';
            }
            else if (rg.row === 0 && lg.row >= 1) {
                // Right hand up = right jab
                stance = 'jabRight';
            }
            // Mixed positions
            else {
                stance = 'guard';
            }
        }
        // Only left hand detected
        else if (lg && !rg) {
            if (lg.row === 0) {
                stance = 'jabLeft';  // Left hand up = punch
            } else if (lg.row === 1) {
                if (lg.col === 0) {
                    stance = 'hookLeft';  // Left hand middle-left = hook
                } else {
                    stance = 'blockBody';
                }
            } else {
                stance = 'duckLeft';  // Left hand bottom = duck
            }
        }
        // Only right hand detected
        else if (rg && !lg) {
            if (rg.row === 0) {
                stance = 'jabRight';  // Right hand up = punch
            } else if (rg.row === 1) {
                if (rg.col === 1) {
                    stance = 'hookRight';  // Right hand middle-right = hook
                } else {
                    stance = 'blockBody';
                }
            } else {
                stance = 'duckRight';  // Right hand bottom = duck
            }
        }
        
        // Update game stance
        if (typeof BoxingGame !== 'undefined') {
            BoxingGame.setStance(stance);
        }
        
        // Callback
        if (onStanceDetected) {
            onStanceDetected(stance);
        }
    }
    
    // Stop the camera
    function stopCamera() {
        isRunning = false;
        
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        const statusEl = document.getElementById('cameraStatus');
        const startBtn = document.getElementById('startBtn');
        
        if (statusEl) {
            statusEl.textContent = 'Camera stopped.';
            statusEl.className = 'camera-status';
        }
        
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Camera';
        }
    }
    
    // Initialize
    async function init() {
        const success = await initMediaPipe();
        
        const startBtn = document.getElementById('startBtn');
        if (startBtn && success) {
            startBtn.disabled = false;
            startBtn.addEventListener('click', () => {
                if (isRunning) {
                    stopCamera();
                } else {
                    startCamera();
                }
            });
        }
        
        return success;
    }
    
    // Set callback for stance detection
    function setOnStanceDetected(callback) {
        onStanceDetected = callback;
    }
    
    // Get current hand positions
    function getHandPositions() {
        return {
            left: leftHandGrid,
            right: rightHandGrid
        };
    }
    
    // Public API
    return {
        init,
        startCamera,
        stopCamera,
        setOnStanceDetected,
        getHandPositions
    };
})();
