// AI Depth Sensor Module
// Estimates hand depth using multiple techniques:
// 1. MediaPipe z-coordinates (relative depth)
// 2. Hand scale estimation (larger = closer)
// 3. Velocity tracking for punch detection

const DepthSensor = (function() {
    // Calibration constants
    const REFERENCE_HAND_SIZE = 0.15; // Reference hand size at neutral position
    const DEPTH_SMOOTHING = 0.7; // Smoothing factor for depth estimation (higher = more responsive)
    const VELOCITY_THRESHOLD = 0.006; // Threshold for detecting forward punch (lower = more sensitive)
    const PUNCH_COOLDOWN = 80; // Milliseconds between punch detections (reduced for responsiveness)
    
    // State tracking for each hand
    let leftHandState = createHandState();
    let rightHandState = createHandState();
    
    // Punch callbacks
    let onPunchDetected = null;
    
    function createHandState() {
        return {
            // Current estimated depth (0 = neutral, negative = forward/closer)
            depth: 0,
            smoothedDepth: 0,
            
            // Raw depth components (for debugging)
            rawPalmZ: 0,        // Raw MediaPipe z-coordinate
            scaleDepth: 0,      // Depth derived from hand scale
            rawCombinedDepth: 0, // Combined before smoothing
            
            // Depth history for velocity calculation
            depthHistory: [],
            velocityHistory: [], // For graph visualization
            historyMaxLength: 5, // Reduced for faster velocity response
            velocityHistoryMaxLength: 50, // Longer history for graph
            
            // Velocity (change in depth per frame)
            velocity: 0,
            
            // Hand scale (palm size)
            scale: REFERENCE_HAND_SIZE,
            
            // Punch detection
            isPunching: false,
            punchStartTime: 0,
            lastPunchTime: 0,
            punchPower: 0, // 0-1 based on velocity
            
            // Position tracking
            position: { x: 0, y: 0, z: 0 },
            
            // Fist detection
            isFist: false
        };
    }
    
    // Calculate hand scale from landmarks (distance between palm points)
    function calculateHandScale(landmarks) {
        // Use distance from wrist (0) to middle finger MCP (9) as scale reference
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        
        const dx = middleMCP.x - wrist.x;
        const dy = middleMCP.y - wrist.y;
        const dz = (middleMCP.z || 0) - (wrist.z || 0);
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // Calculate average z-coordinate from palm landmarks
    function calculatePalmDepth(landmarks) {
        // Palm landmarks: wrist(0), thumb_cmc(1), index_mcp(5), middle_mcp(9), ring_mcp(13), pinky_mcp(17)
        const palmIndices = [0, 1, 5, 9, 13, 17];
        let totalZ = 0;
        
        for (const idx of palmIndices) {
            totalZ += landmarks[idx].z || 0;
        }
        
        return totalZ / palmIndices.length;
    }
    
    // Calculate hand center position
    function calculateHandCenter(landmarks) {
        // Use palm center (average of wrist and MCPs)
        const wrist = landmarks[0];
        const indexMCP = landmarks[5];
        const pinkyMCP = landmarks[17];
        
        return {
            x: (wrist.x + indexMCP.x + pinkyMCP.x) / 3,
            y: (wrist.y + indexMCP.y + pinkyMCP.y) / 3,
            z: ((wrist.z || 0) + (indexMCP.z || 0) + (pinkyMCP.z || 0)) / 3
        };
    }
    
    // Detect if hand is making a fist (for punch detection)
    function detectFist(landmarks) {
        // Check if fingers are curled by comparing fingertip to MCP distances
        const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
        const fingerMCPs = [5, 9, 13, 17];  // Corresponding MCPs
        const wrist = landmarks[0];
        
        let curledFingers = 0;
        
        for (let i = 0; i < fingerTips.length; i++) {
            const tip = landmarks[fingerTips[i]];
            const mcp = landmarks[fingerMCPs[i]];
            
            // Distance from tip to wrist
            const tipToWrist = Math.sqrt(
                Math.pow(tip.x - wrist.x, 2) + 
                Math.pow(tip.y - wrist.y, 2)
            );
            
            // Distance from MCP to wrist
            const mcpToWrist = Math.sqrt(
                Math.pow(mcp.x - wrist.x, 2) + 
                Math.pow(mcp.y - wrist.y, 2)
            );
            
            // If tip is closer to wrist than MCP, finger is curled
            if (tipToWrist < mcpToWrist * 1.3) {
                curledFingers++;
            }
        }
        
        // Consider it a fist if 3+ fingers are curled
        return curledFingers >= 3;
    }
    
    // Process landmarks and update hand state
    function processHand(landmarks, handState, handName) {
        const now = Date.now();
        
        // Calculate current depth using multiple methods
        const palmDepth = calculatePalmDepth(landmarks);
        const handScale = calculateHandScale(landmarks);
        const position = calculateHandCenter(landmarks);
        
        // Combine depth estimates:
        // 1. Palm z-coordinate (MediaPipe provides this, negative = closer)
        // 2. Hand scale (larger = closer, so invert and normalize)
        const scaleDepth = -(handScale - REFERENCE_HAND_SIZE) / REFERENCE_HAND_SIZE;
        
        // Weighted combination - amplify the depth signal for better detection
        // Palm z is more reliable, scale helps confirm forward movement
        const rawDepth = (palmDepth * 0.6 + scaleDepth * 0.4) * 1.5; // Amplify depth signal
        
        // Store raw values for debugging
        handState.rawPalmZ = palmDepth;
        handState.scaleDepth = scaleDepth;
        handState.rawCombinedDepth = rawDepth;
        
        // Smooth the depth reading
        handState.smoothedDepth = handState.smoothedDepth * (1 - DEPTH_SMOOTHING) + 
                                   rawDepth * DEPTH_SMOOTHING;
        
        // Update depth history
        handState.depthHistory.push(handState.smoothedDepth);
        if (handState.depthHistory.length > handState.historyMaxLength) {
            handState.depthHistory.shift();
        }
        
        // Calculate velocity (change in depth) - use fewer samples for faster response
        if (handState.depthHistory.length >= 2) {
            const len = handState.depthHistory.length;
            // Use just last 2 samples for instant velocity detection
            handState.velocity = handState.depthHistory[len - 1] - handState.depthHistory[len - 2];
        }
        
        // Update velocity history for graph visualization
        handState.velocityHistory.push(handState.velocity);
        if (handState.velocityHistory.length > handState.velocityHistoryMaxLength) {
            handState.velocityHistory.shift();
        }
        
        // Update position and scale
        handState.position = position;
        handState.scale = handScale;
        handState.depth = handState.smoothedDepth;
        
        // Detect fist
        handState.isFist = detectFist(landmarks);
        
        // Punch detection: forward velocity + fist
        const timeSinceLastPunch = now - handState.lastPunchTime;
        
        if (!handState.isPunching && 
            handState.velocity < -VELOCITY_THRESHOLD && // Moving forward (negative z)
            timeSinceLastPunch > PUNCH_COOLDOWN) {
            
            // Punch started!
            handState.isPunching = true;
            handState.punchStartTime = now;
            // More generous power scaling for better feedback
            handState.punchPower = Math.min(1, Math.abs(handState.velocity) / (VELOCITY_THRESHOLD * 2));
            
            // Trigger callback
            if (onPunchDetected) {
                onPunchDetected({
                    hand: handName,
                    power: handState.punchPower,
                    position: { ...position },
                    velocity: handState.velocity,
                    isFist: handState.isFist
                });
            }
        }
        
        // End punch when velocity reverses or slows
        if (handState.isPunching && handState.velocity > -VELOCITY_THRESHOLD * 0.3) {
            handState.isPunching = false;
            handState.lastPunchTime = now;
        }
        
        return handState;
    }
    
    // Main update function - call this with MediaPipe results
    function update(results) {
        // Reset states if hands not detected
        let leftDetected = false;
        let rightDetected = false;
        
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // MediaPipe labels are from camera perspective (mirrored)
                const isLeftHand = handedness.label === 'Right';
                
                if (isLeftHand) {
                    leftHandState = processHand(landmarks, leftHandState, 'left');
                    leftDetected = true;
                } else {
                    rightHandState = processHand(landmarks, rightHandState, 'right');
                    rightDetected = true;
                }
            }
        }
        
        // Decay depth values when hands not detected
        if (!leftDetected) {
            leftHandState.depth *= 0.9;
            leftHandState.velocity *= 0.8;
            leftHandState.isPunching = false;
        }
        if (!rightDetected) {
            rightHandState.depth *= 0.9;
            rightHandState.velocity *= 0.8;
            rightHandState.isPunching = false;
        }
        
        return {
            left: leftDetected ? { ...leftHandState } : null,
            right: rightDetected ? { ...rightHandState } : null
        };
    }
    
    // Get current hand states
    function getHandStates() {
        return {
            left: { ...leftHandState },
            right: { ...rightHandState }
        };
    }
    
    // Set punch detection callback
    function setOnPunchDetected(callback) {
        onPunchDetected = callback;
    }
    
    // Calibrate reference hand size (call when user is at neutral position)
    function calibrate(landmarks) {
        if (landmarks) {
            const scale = calculateHandScale(landmarks);
            // Could update REFERENCE_HAND_SIZE here
            console.log('Calibrated hand scale:', scale);
        }
    }
    
    // Get depth visualization data for debugging
    function getDebugData() {
        return {
            left: {
                // Raw values
                rawPalmZ: leftHandState.rawPalmZ,
                scaleDepth: leftHandState.scaleDepth,
                rawCombinedDepth: leftHandState.rawCombinedDepth,
                // Processed values
                depth: leftHandState.depth,
                velocity: leftHandState.velocity,
                scale: leftHandState.scale,
                // Velocity history for graph
                velocityHistory: [...leftHandState.velocityHistory],
                // State
                isPunching: leftHandState.isPunching,
                isFist: leftHandState.isFist,
                power: leftHandState.punchPower,
                // Position
                position: { ...leftHandState.position }
            },
            right: {
                // Raw values
                rawPalmZ: rightHandState.rawPalmZ,
                scaleDepth: rightHandState.scaleDepth,
                rawCombinedDepth: rightHandState.rawCombinedDepth,
                // Processed values
                depth: rightHandState.depth,
                velocity: rightHandState.velocity,
                scale: rightHandState.scale,
                // Velocity history for graph
                velocityHistory: [...rightHandState.velocityHistory],
                // State
                isPunching: rightHandState.isPunching,
                isFist: rightHandState.isFist,
                power: rightHandState.punchPower,
                // Position
                position: { ...rightHandState.position }
            },
            // Thresholds for UI display
            thresholds: {
                velocityThreshold: VELOCITY_THRESHOLD,
                punchCooldown: PUNCH_COOLDOWN,
                depthSmoothing: DEPTH_SMOOTHING,
                referenceHandSize: REFERENCE_HAND_SIZE
            }
        };
    }
    
    // Reset all tracking
    function reset() {
        leftHandState = createHandState();
        rightHandState = createHandState();
    }
    
    // Public API
    return {
        update,
        getHandStates,
        setOnPunchDetected,
        calibrate,
        getDebugData,
        reset
    };
})();
