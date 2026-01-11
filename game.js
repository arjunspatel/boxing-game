// Boxing Game - Game Logic and Rendering

const BoxingGame = (function() {
    let canvas, ctx;
    let currentStance = 'idle';
    
    // Boxer configuration
    const boxer = {
        x: 200,
        y: 280,
        bodyWidth: 80,
        bodyHeight: 120,
        headRadius: 35,
        armLength: 70,
        gloveRadius: 25
    };
    
    // Colors for the boxer (viewed from behind)
    const colors = {
        skin: '#d4a574',
        skinShadow: '#b8956a',
        shorts: '#e94560',
        shortsShadow: '#c73e54',
        gloveLeft: '#e94560',
        gloveRight: '#4ecdc4',
        hair: '#2d2d2d',
        tank: '#1a1a2e',
        tankHighlight: '#2d2d44'
    };
    
    // Stance definitions - positions for left and right gloves
    // Coordinates are relative to boxer center, from behind view
    const stances = {
        idle: {
            name: 'Idle',
            leftGlove: { x: -50, y: 20, z: 0 },
            rightGlove: { x: 50, y: 20, z: 0 },
            bodyOffset: { x: 0, y: 0 },
            lean: 0
        },
        guard: {
            name: 'Guard Up',
            leftGlove: { x: -35, y: -60, z: 10 },
            rightGlove: { x: 35, y: -60, z: 10 },
            bodyOffset: { x: 0, y: 0 },
            lean: 0
        },
        guardLeft: {
            name: 'Guard Left',
            leftGlove: { x: -35, y: -60, z: 10 },
            rightGlove: { x: 35, y: -60, z: 10 },
            bodyOffset: { x: -20, y: 0 },
            lean: -5
        },
        guardRight: {
            name: 'Guard Right',
            leftGlove: { x: -35, y: -60, z: 10 },
            rightGlove: { x: 35, y: -60, z: 10 },
            bodyOffset: { x: 20, y: 0 },
            lean: 5
        },
        jabLeft: {
            name: 'Left Jab',
            leftGlove: { x: -20, y: -100, z: 30 },
            rightGlove: { x: 40, y: -50, z: 5 },
            bodyOffset: { x: -5, y: -5 },
            lean: -5
        },
        jabRight: {
            name: 'Right Jab',
            leftGlove: { x: -40, y: -50, z: 5 },
            rightGlove: { x: 20, y: -100, z: 30 },
            bodyOffset: { x: 5, y: -5 },
            lean: 5
        },
        hookLeft: {
            name: 'Left Hook',
            leftGlove: { x: -80, y: -40, z: 20 },
            rightGlove: { x: 35, y: -55, z: 5 },
            bodyOffset: { x: 10, y: 0 },
            lean: 15
        },
        hookRight: {
            name: 'Right Hook',
            leftGlove: { x: -35, y: -55, z: 5 },
            rightGlove: { x: 80, y: -40, z: 20 },
            bodyOffset: { x: -10, y: 0 },
            lean: -15
        },
        uppercutLeft: {
            name: 'Left Uppercut',
            leftGlove: { x: -25, y: -20, z: 25 },
            rightGlove: { x: 40, y: -50, z: 5 },
            bodyOffset: { x: -5, y: 10 },
            lean: -10
        },
        uppercutRight: {
            name: 'Right Uppercut',
            leftGlove: { x: -40, y: -50, z: 5 },
            rightGlove: { x: 25, y: -20, z: 25 },
            bodyOffset: { x: 5, y: 10 },
            lean: 10
        },
        duckLeft: {
            name: 'Duck Left',
            leftGlove: { x: -45, y: -30, z: 5 },
            rightGlove: { x: 30, y: -30, z: 5 },
            bodyOffset: { x: -30, y: 40 },
            lean: -20
        },
        duckRight: {
            name: 'Duck Right',
            leftGlove: { x: -30, y: -30, z: 5 },
            rightGlove: { x: 45, y: -30, z: 5 },
            bodyOffset: { x: 30, y: 40 },
            lean: 20
        },
        blockBody: {
            name: 'Block Body',
            leftGlove: { x: -30, y: 10, z: 15 },
            rightGlove: { x: 30, y: 10, z: 15 },
            bodyOffset: { x: 0, y: 10 },
            lean: 0
        }
    };
    
    // Draw the boxing ring floor
    function drawRing(ctx, width, height) {
        // Ring floor with perspective
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.55);
        ctx.lineTo(width, height * 0.55);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        
        // Ring mat
        ctx.fillStyle = '#4a90a4';
        ctx.beginPath();
        ctx.moveTo(width * 0.05, height * 0.58);
        ctx.lineTo(width * 0.95, height * 0.58);
        ctx.lineTo(width * 0.85, height * 0.95);
        ctx.lineTo(width * 0.15, height * 0.95);
        ctx.closePath();
        ctx.fill();
        
        // Ring mat center circle
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(width/2, height * 0.78, 60, 25, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ropes (background)
        const ropeColors = ['#ff0000', '#ffffff', '#ff0000'];
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = ropeColors[i];
            ctx.lineWidth = 4;
            ctx.beginPath();
            const ropeY = height * 0.35 + i * 25;
            ctx.moveTo(0, ropeY);
            ctx.quadraticCurveTo(width/2, ropeY + 5, width, ropeY);
            ctx.stroke();
        }
        
        // Corner posts
        ctx.fillStyle = '#333';
        ctx.fillRect(-5, height * 0.3, 15, height * 0.35);
        ctx.fillRect(width - 10, height * 0.3, 15, height * 0.35);
    }
    
    // Draw arm with glove
    function drawArm(ctx, glovePos, gloveColor, isLeft) {
        const shoulderX = isLeft ? -35 : 35;
        const shoulderY = -40;
        
        // Arm
        ctx.strokeStyle = colors.skin;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        
        // Elbow position (midpoint with some offset)
        const elbowX = shoulderX + (glovePos.x - shoulderX) * 0.5;
        const elbowY = shoulderY + (glovePos.y - shoulderY) * 0.4 + 15;
        
        ctx.quadraticCurveTo(elbowX, elbowY, glovePos.x, glovePos.y);
        ctx.stroke();
        
        // Glove
        const gloveScale = 1 + glovePos.z * 0.01; // Larger when closer (punching)
        ctx.fillStyle = gloveColor;
        ctx.beginPath();
        ctx.ellipse(glovePos.x, glovePos.y, 22 * gloveScale, 18 * gloveScale, 
                   isLeft ? -0.3 : 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Glove highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(glovePos.x - 5, glovePos.y - 5, 8 * gloveScale, 6 * gloveScale, 
                   0, 0, Math.PI * 2);
        ctx.fill();
        
        // Glove wrist band
        ctx.fillStyle = '#fff';
        const wristX = glovePos.x + (shoulderX - glovePos.x) * 0.15;
        const wristY = glovePos.y + (shoulderY - glovePos.y) * 0.15;
        ctx.beginPath();
        ctx.ellipse(wristX, wristY, 12, 8, Math.atan2(glovePos.y - shoulderY, glovePos.x - shoulderX), 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw boxer from behind
    function drawBoxer(ctx, stance, centerX, centerY, scale = 1) {
        const s = stances[stance] || stances.idle;
        const bx = centerX + s.bodyOffset.x * scale;
        const by = centerY + s.bodyOffset.y * scale;
        
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(s.lean * Math.PI / 180);
        ctx.scale(scale, scale);
        
        // Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 150, 50, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.fillStyle = colors.skin;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(-25, 60);
        ctx.quadraticCurveTo(-30, 100, -25, 140);
        ctx.lineTo(-15, 140);
        ctx.quadraticCurveTo(-15, 100, -15, 60);
        ctx.closePath();
        ctx.fill();
        
        // Right leg
        ctx.beginPath();
        ctx.moveTo(25, 60);
        ctx.quadraticCurveTo(30, 100, 25, 140);
        ctx.lineTo(15, 140);
        ctx.quadraticCurveTo(15, 100, 15, 60);
        ctx.closePath();
        ctx.fill();
        
        // Shoes
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(-20, 145, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(20, 145, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shorts
        ctx.fillStyle = colors.shorts;
        ctx.beginPath();
        ctx.moveTo(-35, 30);
        ctx.lineTo(35, 30);
        ctx.lineTo(30, 70);
        ctx.lineTo(-30, 70);
        ctx.closePath();
        ctx.fill();
        
        // Shorts stripe
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, 30, 4, 40);
        
        // Torso (tank top from behind)
        ctx.fillStyle = colors.tank;
        ctx.beginPath();
        ctx.moveTo(-35, -50);
        ctx.quadraticCurveTo(-45, 0, -35, 35);
        ctx.lineTo(35, 35);
        ctx.quadraticCurveTo(45, 0, 35, -50);
        ctx.closePath();
        ctx.fill();
        
        // Tank top back detail
        ctx.strokeStyle = colors.tankHighlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(0, 30);
        ctx.stroke();
        
        // Neck
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.ellipse(0, -55, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head (from behind)
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.ellipse(0, -85, 30, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair (back of head)
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.ellipse(0, -90, 28, 30, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Ears
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.ellipse(-30, -85, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(30, -85, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw arms and gloves
        drawArm(ctx, s.leftGlove, colors.gloveLeft, true);
        drawArm(ctx, s.rightGlove, colors.gloveRight, false);
        
        ctx.restore();
    }
    
    // Main render function
    function render() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background gradient (arena lights)
        const gradient = ctx.createRadialGradient(
            canvas.width/2, 0, 0,
            canvas.width/2, 0, canvas.height
        );
        gradient.addColorStop(0, '#3d3d5c');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Spotlight effect
        ctx.fillStyle = 'rgba(255,255,200,0.1)';
        ctx.beginPath();
        ctx.ellipse(canvas.width/2, canvas.height * 0.7, 150, 80, 0, 0, Math.PI * 2);
        ctx.fill();
        
        drawRing(ctx, canvas.width, canvas.height);
        drawBoxer(ctx, currentStance, boxer.x, boxer.y);
        
        requestAnimationFrame(render);
    }
    
    // Initialize the game
    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas not found:', canvasId);
            return;
        }
        ctx = canvas.getContext('2d');
        render();
    }
    
    // Set the current stance
    function setStance(stance) {
        if (stances[stance]) {
            currentStance = stance;
            const stanceLabel = document.getElementById('stanceLabel');
            if (stanceLabel) {
                stanceLabel.textContent = stances[stance].name;
            }
        }
    }
    
    // Get current stance
    function getStance() {
        return currentStance;
    }
    
    // Get stance name
    function getStanceName(stance) {
        return stances[stance]?.name || 'Unknown';
    }
    
    // Public API
    return {
        init,
        setStance,
        getStance,
        getStanceName,
        stances
    };
})();
