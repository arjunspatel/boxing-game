// Camera Detection using MediaPipe Hands with Depth Sensing

const CameraDetection = (function() {
    let video, canvasOverlay, ctxOverlay;
    let hands = null;
    let isRunning = false;
    let onStanceDetected = null;
    let onPunchDetected = null;
    
    // Grid configuration: finer grid for smoother transitions
    // Internal grid is 4x6 for smoother detection, but we map to logical zones
    const GRID_COLS = 4;
    const GRID_ROWS = 6;
    
    // Hand positions in grid
    let leftHandGrid = null;
    let rightHandGrid = null;
    
    // Raw landmark data for depth processing
    let lastResults = null;
    
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
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
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
            
            // Clean up any existing stream
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
            isRunning = false;
            
            if (canvasOverlay) {
                ctxOverlay = canvasOverlay.getContext('2d');
            }
            
            // Get camera access with higher resolution for better depth estimation
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
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
                canvasOverlay.width = video.videoWidth || 640;
                canvasOverlay.height = video.videoHeight || 480;
            }
            
            isRunning = true;
            
            if (statusEl) {
                statusEl.textContent = 'Camera active - detecting hands & depth...';
                statusEl.className = 'camera-status active';
            }
            
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
        lastResults = results;
        
        // Clear overlay
        if (ctxOverlay && canvasOverlay) {
            ctxOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
        }
        
        // Reset grid highlights
        clearGridHighlights();
        
        // Track detected hands
        leftHandGrid = null;
        rightHandGrid = null;
        
        // Process with depth sensor
        let depthData = null;
        if (typeof DepthSensor !== 'undefined') {
            depthData = DepthSensor.update(results);
        }
        
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // Get wrist position (landmark 0) as hand position
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                
                // Average position
                const handX = (wrist.x + middleMCP.x) / 2;
                const handY = (wrist.y + middleMCP.y) / 2;
                
                // Convert to grid position (mirrored)
                const gridCol = handX < 0.5 ? 1 : 0;
                const gridRow = Math.floor(handY * GRID_ROWS);
                const clampedRow = Math.max(0, Math.min(GRID_ROWS - 1, gridRow));
                
                const gridPos = { row: clampedRow, col: gridCol };
                
                // MediaPipe returns "Left" or "Right" from camera perspective
                const isLeftHand = handedness.label === 'Right';
                
                if (isLeftHand) {
                    leftHandGrid = gridPos;
                } else {
                    rightHandGrid = gridPos;
                }
                
                // Draw hand landmarks on overlay
                if (ctxOverlay) {
                    drawHandLandmarks(landmarks, isLeftHand, depthData);
                }
            }
        }
        
        // Update grid highlights
        updateGridHighlights();
        
        // Update 3D game with hand tracking data
        if (typeof BoxingGame3D !== 'undefined' && depthData) {
            BoxingGame3D.updateHandTracking(depthData.left, depthData.right);
        }
        
        // Detect stance based on hand positions
        detectStance();
        
        // Update detection info display
        updateDetectionInfo(depthData);
    }
    
    // Draw hand landmarks on overlay with depth visualization
    function drawHandLandmarks(landmarks, isLeftHand, depthData) {
        if (!ctxOverlay || !canvasOverlay) return;
        
        const baseColor = isLeftHand ? '#e94560' : '#4ecdc4';
        const width = canvasOverlay.width;
        const height = canvasOverlay.height;
        
        // Get depth info for this hand
        const handDepth = depthData ? (isLeftHand ? depthData.left : depthData.right) : null;
        
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],  // Index
            [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
            [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
            [5, 9], [9, 13], [13, 17]  // Palm
        ];
        
        // Adjust line width based on depth (thicker = closer)
        let lineWidth = 2;
        if (handDepth && handDepth.depth) {
            lineWidth = Math.max(1, Math.min(5, 2 - handDepth.depth * 10));
        }
        
        ctxOverlay.strokeStyle = baseColor;
        ctxOverlay.lineWidth = lineWidth;
        
        for (const [i, j] of connections) {
            const start = landmarks[i];
            const end = landmarks[j];
            ctxOverlay.beginPath();
            ctxOverlay.moveTo((1 - start.x) * width, start.y * height);
            ctxOverlay.lineTo((1 - end.x) * width, end.y * height);
            ctxOverlay.stroke();
        }
        
        // Draw landmarks with depth-based size
        for (let idx = 0; idx < landmarks.length; idx++) {
            const landmark = landmarks[idx];
            
            // Size based on z-coordinate (closer = larger)
            let size = 3;
            if (landmark.z !== undefined) {
                size = Math.max(2, Math.min(8, 4 - landmark.z * 20));
            }
            
            ctxOverlay.fillStyle = baseColor;
            ctxOverlay.beginPath();
            ctxOverlay.arc((1 - landmark.x) * width, landmark.y * height, size, 0, 2 * Math.PI);
            ctxOverlay.fill();
        }
        
        // Draw depth indicator
        if (handDepth) {
            const centerX = (1 - landmarks[9].x) * width;
            const centerY = landmarks[9].y * height;
            
            // Depth bar
            const barHeight = 40;
            const barWidth = 6;
            const depthNormalized = Math.max(-1, Math.min(1, handDepth.depth * 5));
            const fillHeight = Math.abs(depthNormalized) * barHeight / 2;
            
            ctxOverlay.fillStyle = 'rgba(0,0,0,0.5)';
            ctxOverlay.fillRect(centerX - barWidth/2, centerY - barHeight/2, barWidth, barHeight);
            
            // Fill based on depth direction
            if (depthNormalized < 0) {
                // Forward (closer) - fill from center up
                ctxOverlay.fillStyle = '#00ff00';
                ctxOverlay.fillRect(centerX - barWidth/2, centerY - fillHeight, barWidth, fillHeight);
            } else {
                // Back (farther) - fill from center down
                ctxOverlay.fillStyle = '#ff6600';
                ctxOverlay.fillRect(centerX - barWidth/2, centerY, barWidth, fillHeight);
            }
            
            // Punch indicator
            if (handDepth.isPunching) {
                ctxOverlay.strokeStyle = '#ffff00';
                ctxOverlay.lineWidth = 3;
                ctxOverlay.beginPath();
                ctxOverlay.arc(centerX, centerY, 30 + handDepth.punchPower * 20, 0, Math.PI * 2);
                ctxOverlay.stroke();
                
                ctxOverlay.fillStyle = '#ffff00';
                ctxOverlay.font = 'bold 14px Arial';
                ctxOverlay.fillText('PUNCH!', centerX - 25, centerY - 40);
            }
            
            // Velocity arrow
            if (Math.abs(handDepth.velocity) > 0.002) {
                const arrowLength = Math.min(30, Math.abs(handDepth.velocity) * 500);
                const arrowDir = handDepth.velocity < 0 ? -1 : 1;
                
                ctxOverlay.strokeStyle = handDepth.velocity < 0 ? '#00ff00' : '#ff6600';
                ctxOverlay.lineWidth = 2;
                ctxOverlay.beginPath();
                ctxOverlay.moveTo(centerX + 20, centerY);
                ctxOverlay.lineTo(centerX + 20 + arrowLength * arrowDir, centerY);
                // Arrow head
                ctxOverlay.lineTo(centerX + 20 + arrowLength * arrowDir - 5 * arrowDir, centerY - 5);
                ctxOverlay.moveTo(centerX + 20 + arrowLength * arrowDir, centerY);
                ctxOverlay.lineTo(centerX + 20 + arrowLength * arrowDir - 5 * arrowDir, centerY + 5);
                ctxOverlay.stroke();
            }
        }
    }
    
    // Clear grid highlights (no-op since grid overlay removed)
    function clearGridHighlights() {
        // Grid overlay removed for smoother experience
    }
    
    // Update grid highlights (no-op since grid overlay removed)
    function updateGridHighlights() {
        // Grid overlay removed for smoother experience
    }
    
    // Update detection info display with depth data
    function updateDetectionInfo(depthData) {
        const leftPosEl = document.getElementById('leftHandPos');
        const rightPosEl = document.getElementById('rightHandPos');
        const leftDepthEl = document.getElementById('leftHandDepth');
        const rightDepthEl = document.getElementById('rightHandDepth');
        
        // Map fine grid to display zones (Top/Middle/Bottom, Left/Right)
        const rowNames = ['Top', 'Top', 'Middle', 'Middle', 'Bottom', 'Bottom'];
        const colNames = ['Left', 'Left', 'Right', 'Right'];
        
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
        
        // Depth info
        if (depthData) {
            if (leftDepthEl && depthData.left) {
                const d = depthData.left;
                leftDepthEl.textContent = `Depth: ${d.depth.toFixed(2)} | Vel: ${d.velocity.toFixed(3)}`;
                leftDepthEl.className = d.isPunching ? 'depth-info punching' : 'depth-info';
            } else if (leftDepthEl) {
                leftDepthEl.textContent = '';
            }
            
            if (rightDepthEl && depthData.right) {
                const d = depthData.right;
                rightDepthEl.textContent = `Depth: ${d.depth.toFixed(2)} | Vel: ${d.velocity.toFixed(3)}`;
                rightDepthEl.className = d.isPunching ? 'depth-info punching' : 'depth-info';
            } else if (rightDepthEl) {
                rightDepthEl.textContent = '';
            }
        }
    }
    
    // Detect stance from grid positions - map fine grid to logical zones
    function detectStance() {
        let stance = 'idle';
        
        const lg = leftHandGrid;
        const rg = rightHandGrid;
        
        // Map fine grid (4x6) to logical zones (2x3)
        // Rows: 0-1 = Top, 2-3 = Middle, 4-5 = Bottom
        // Cols: 0-1 = Left, 2-3 = Right
        const getLogicalRow = (row) => Math.floor(row / 2); // 0-1->0, 2-3->1, 4-5->2
        const getLogicalCol = (col) => Math.floor(col / 2); // 0-1->0, 2-3->1
        
        const lgRow = lg ? getLogicalRow(lg.row) : null;
        const lgCol = lg ? getLogicalCol(lg.col) : null;
        const rgRow = rg ? getLogicalRow(rg.row) : null;
        const rgCol = rg ? getLogicalCol(rg.col) : null;
        
        if (!lg && !rg) {
            stance = 'idle';
        } else if (lg && rg) {
            if (lgRow === 0 && rgRow === 0) {
                if (lgCol === 0 && rgCol === 0) {
                    stance = 'guardLeft';
                } else if (lgCol === 1 && rgCol === 1) {
                    stance = 'guardRight';
                } else {
                    stance = 'guard';
                }
            } else if (lgRow === 2 && rgRow === 2) {
                stance = lgCol === 0 ? 'duckLeft' : 'duckRight';
            } else if (lgRow === 1 && rgRow === 1) {
                stance = 'blockBody';
            } else if (lgRow === 0 && rgRow >= 1) {
                stance = 'jabLeft';
            } else if (rgRow === 0 && lgRow >= 1) {
                stance = 'jabRight';
            } else {
                stance = 'guard';
            }
        } else if (lg && !rg) {
            if (lgRow === 0) stance = 'jabLeft';
            else if (lgRow === 1) stance = lgCol === 0 ? 'hookLeft' : 'blockBody';
            else stance = 'duckLeft';
        } else if (rg && !lg) {
            if (rgRow === 0) stance = 'jabRight';
            else if (rgRow === 1) stance = rgCol === 1 ? 'hookRight' : 'blockBody';
            else stance = 'duckRight';
        }
        
        // Update legacy game stance
        if (typeof BoxingGame !== 'undefined') {
            BoxingGame.setStance(stance);
        }
        
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
        
        // Reset depth sensor
        if (typeof DepthSensor !== 'undefined') {
            DepthSensor.reset();
        }
    }
    
    // Initialize
    async function init() {
        const success = await initMediaPipe();
        
        // Setup depth sensor punch callback
        if (typeof DepthSensor !== 'undefined') {
            DepthSensor.setOnPunchDetected((punchData) => {
                console.log('Punch detected:', punchData);
                
                // Trigger 3D punch animation
                if (typeof BoxingGame3D !== 'undefined') {
                    BoxingGame3D.triggerPunch(punchData.hand, punchData.power);
                }
                
                // Callback
                if (onPunchDetected) {
                    onPunchDetected(punchData);
                }
            });
        }
        
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
    
    // Set callbacks
    function setOnStanceDetected(callback) {
        onStanceDetected = callback;
    }
    
    function setOnPunchDetected(callback) {
        onPunchDetected = callback;
    }
    
    // Get current hand positions
    function getHandPositions() {
        return {
            left: leftHandGrid,
            right: rightHandGrid
        };
    }
    
    // Get raw landmark data
    function getRawLandmarks() {
        return lastResults;
    }
    
    // Public API
    return {
        init,
        startCamera,
        stopCamera,
        setOnStanceDetected,
        setOnPunchDetected,
        getHandPositions,
        getRawLandmarks
    };
})();
