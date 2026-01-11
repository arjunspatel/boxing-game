// 3D Boxing Game - First Person View with Three.js
// Supports Mixamo model loading and procedural gloves

const BoxingGame3D = (function() {
    let scene, camera, renderer, clock;
    let container;
    let leftGlove, rightGlove;
    let leftArm, rightArm;
    let opponent;
    let mixers = []; // Animation mixers for loaded models
    let isInitialized = false;
    
    // Hand tracking state
    let leftHandData = null;
    let rightHandData = null;
    
    // Animation state
    let leftPunchAnimation = { active: false, progress: 0, power: 0 };
    let rightPunchAnimation = { active: false, progress: 0, power: 0 };
    
    // Default glove positions (first person view)
    const DEFAULT_POSITIONS = {
        left: { x: -0.4, y: -0.3, z: -0.6 },
        right: { x: 0.4, y: -0.3, z: -0.6 }
    };
    
    // Punch extension distance (increased for more dramatic punch)
    const PUNCH_DISTANCE = 1.2;
    
    // Colors
    const COLORS = {
        leftGlove: 0xe94560,
        rightGlove: 0x4ecdc4,
        ring: 0x4a90a4,
        ropes: 0xff0000
    };
    
    // Initialize the 3D scene
    function init(containerId) {
        container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return false;
        }
        
        // Scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        scene.fog = new THREE.Fog(0x1a1a2e, 5, 20);
        
        // Camera (first person perspective)
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
        camera.position.set(0, 1.7, 0); // Eye level
        camera.lookAt(0, 1.7, -5);
        
        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);
        
        // Clock for animations
        clock = new THREE.Clock();
        
        // Lighting
        setupLighting();
        
        // Create environment
        createRing();
        
        // Create procedural gloves (can be replaced with Mixamo models)
        createProceduralGloves();
        
        // Create opponent placeholder
        createOpponent();
        
        // Handle resize
        window.addEventListener('resize', onWindowResize);
        
        // Start render loop
        isInitialized = true;
        animate();
        
        return true;
    }
    
    function setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambient);
        
        // Main spotlight (arena light)
        const spotlight = new THREE.SpotLight(0xffffff, 1.5);
        spotlight.position.set(0, 10, 0);
        spotlight.angle = Math.PI / 4;
        spotlight.penumbra = 0.3;
        spotlight.decay = 1;
        spotlight.distance = 30;
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 1024;
        spotlight.shadow.mapSize.height = 1024;
        scene.add(spotlight);
        
        // Fill lights
        const fillLeft = new THREE.PointLight(0xe94560, 0.3);
        fillLeft.position.set(-5, 3, 2);
        scene.add(fillLeft);
        
        const fillRight = new THREE.PointLight(0x4ecdc4, 0.3);
        fillRight.position.set(5, 3, 2);
        scene.add(fillRight);
        
        // Rim light behind
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 3, 5);
        scene.add(rimLight);
    }
    
    function createRing() {
        // Ring floor
        const floorGeometry = new THREE.PlaneGeometry(8, 8);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.ring,
            roughness: 0.8,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Ring canvas texture (center circle)
        const canvasTexture = createRingTexture();
        const ringCanvas = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 6),
            new THREE.MeshStandardMaterial({ 
                map: canvasTexture,
                roughness: 0.9,
                transparent: true
            })
        );
        ringCanvas.rotation.x = -Math.PI / 2;
        ringCanvas.position.y = 0.01;
        scene.add(ringCanvas);
        
        // Ring posts
        const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5);
        const postMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333, 
            metalness: 0.8,
            roughness: 0.2
        });
        
        const postPositions = [
            [-3.5, 0.75, -3.5],
            [3.5, 0.75, -3.5],
            [-3.5, 0.75, 3.5],
            [3.5, 0.75, 3.5]
        ];
        
        postPositions.forEach(pos => {
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(...pos);
            post.castShadow = true;
            scene.add(post);
        });
        
        // Ropes
        createRopes();
        
        // Arena backdrop
        const backdropGeometry = new THREE.PlaneGeometry(30, 15);
        const backdropMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f0f1a,
            side: THREE.DoubleSide
        });
        const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
        backdrop.position.set(0, 7, -10);
        scene.add(backdrop);
    }
    
    function createRingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Transparent background
        ctx.clearRect(0, 0, 512, 512);
        
        // Center circle
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(256, 256, 100, 0, Math.PI * 2);
        ctx.stroke();
        
        // Corner marks
        ctx.fillStyle = '#e94560';
        ctx.fillRect(20, 20, 60, 60);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(432, 20, 60, 60);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    function createRopes() {
        const ropeMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.ropes,
            roughness: 0.6
        });
        const whiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.6
        });
        
        const ropeHeights = [0.4, 0.8, 1.2];
        const materials = [ropeMaterial, whiteMaterial, ropeMaterial];
        
        ropeHeights.forEach((height, index) => {
            // Create rope segments for each side
            const sides = [
                { start: [-3.5, height, -3.5], end: [3.5, height, -3.5] },
                { start: [3.5, height, -3.5], end: [3.5, height, 3.5] },
                { start: [3.5, height, 3.5], end: [-3.5, height, 3.5] },
                { start: [-3.5, height, 3.5], end: [-3.5, height, -3.5] }
            ];
            
            sides.forEach(side => {
                const curve = new THREE.LineCurve3(
                    new THREE.Vector3(...side.start),
                    new THREE.Vector3(...side.end)
                );
                const tubeGeometry = new THREE.TubeGeometry(curve, 8, 0.03, 8, false);
                const rope = new THREE.Mesh(tubeGeometry, materials[index]);
                scene.add(rope);
            });
        });
    }
    
    function createProceduralGloves() {
        // Left glove (red)
        leftGlove = createGlove(COLORS.leftGlove);
        leftGlove.position.set(
            DEFAULT_POSITIONS.left.x,
            DEFAULT_POSITIONS.left.y,
            DEFAULT_POSITIONS.left.z
        );
        leftGlove.rotation.set(0.3, 0.2, 0.1);
        camera.add(leftGlove);
        
        // Left arm - positioned to connect with wrist band at (0, 0.02, 0.12)
        leftArm = createArm();
        leftArm.position.set(0, 0.02, 0.32); // Arm center at z=0.32, so front edge is at z=0.12 (wrist)
        leftGlove.add(leftArm);
        
        // Right glove (cyan)
        rightGlove = createGlove(COLORS.rightGlove);
        rightGlove.position.set(
            DEFAULT_POSITIONS.right.x,
            DEFAULT_POSITIONS.right.y,
            DEFAULT_POSITIONS.right.z
        );
        rightGlove.rotation.set(0.3, -0.2, -0.1);
        camera.add(rightGlove);
        
        // Right arm - positioned to connect with wrist band at (0, 0.02, 0.12)
        rightArm = createArm();
        rightArm.position.set(0, 0.02, 0.32); // Arm center at z=0.32, so front edge is at z=0.12 (wrist)
        rightGlove.add(rightArm);
        
        // Add camera to scene
        scene.add(camera);
    }
    
    function createGlove(color) {
        const group = new THREE.Group();
        
        // Main glove body
        const gloveGeometry = new THREE.SphereGeometry(0.12, 32, 32);
        gloveGeometry.scale(1, 0.8, 1.2);
        const gloveMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.1
        });
        const gloveMain = new THREE.Mesh(gloveGeometry, gloveMaterial);
        gloveMain.castShadow = true;
        group.add(gloveMain);
        
        // Thumb area
        const thumbGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const thumb = new THREE.Mesh(thumbGeometry, gloveMaterial);
        thumb.position.set(-0.08, 0, -0.05);
        thumb.castShadow = true;
        group.add(thumb);
        
        // Wrist band - sized to connect seamlessly with the arm
        const wristGeometry = new THREE.CylinderGeometry(0.055, 0.06, 0.06, 16);
        const wristMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5
        });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.set(0, 0.02, 0.12);
        wrist.rotation.x = Math.PI / 2;
        group.add(wrist);
        
        // Laces detail
        const laceMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (let i = 0; i < 4; i++) {
            const lace = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.008, 0.015),
                laceMaterial
            );
            lace.position.set(0, 0.08 - i * 0.03, 0.08 + i * 0.02);
            group.add(lace);
        }
        
        // Highlight/shine
        const highlightGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            roughness: 0
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(-0.04, 0.04, -0.08);
        group.add(highlight);
        
        return group;
    }
    
    function createArm() {
        const group = new THREE.Group();
        
        // Forearm - tapered cylinder, wrist end (front) matches wrist band size
        // The arm extends along Z when rotated, with smaller end toward the glove
        const armGeometry = new THREE.CylinderGeometry(0.055, 0.065, 0.4, 16);
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            roughness: 0.7
        });
        const arm = new THREE.Mesh(armGeometry, skinMaterial);
        arm.rotation.x = Math.PI / 2; // Rotate to extend along Z axis
        arm.castShadow = true;
        group.add(arm);
        
        return group;
    }
    
    function createOpponent() {
        // Placeholder opponent (punching bag style)
        const group = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.3;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 2.0;
        head.castShadow = true;
        group.add(head);
        
        // Target zones (for hit detection)
        const targetMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x330000,
            transparent: true,
            opacity: 0.3
        });
        
        // Face target
        const faceTarget = new THREE.Mesh(
            new THREE.CircleGeometry(0.15, 32),
            targetMaterial
        );
        faceTarget.position.set(0, 2.0, 0.21);
        faceTarget.name = 'target_head';
        group.add(faceTarget);
        
        // Body target
        const bodyTarget = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            targetMaterial
        );
        bodyTarget.position.set(0, 1.4, 0.36);
        bodyTarget.name = 'target_body';
        group.add(bodyTarget);
        
        group.position.set(0, 0, -2.5);
        opponent = group;
        scene.add(opponent);
    }
    
    // Update glove positions based on hand tracking
    function updateHandTracking(leftData, rightData) {
        leftHandData = leftData;
        rightHandData = rightData;
    }
    
    // Trigger a punch animation
    function triggerPunch(hand, power = 1) {
        const animation = hand === 'left' ? leftPunchAnimation : rightPunchAnimation;
        if (!animation.active) {
            animation.active = true;
            animation.progress = 0;
            animation.power = power;
            
            // Visual feedback on opponent
            flashOpponentTarget(power);
        }
    }
    
    function flashOpponentTarget(power) {
        if (!opponent) return;
        
        opponent.children.forEach(child => {
            if (child.name && child.name.startsWith('target_')) {
                const originalOpacity = child.material.opacity;
                child.material.opacity = 0.8;
                child.material.emissive.setHex(0xff0000);
                
                setTimeout(() => {
                    child.material.opacity = originalOpacity;
                    child.material.emissive.setHex(0x330000);
                }, 100 + power * 200);
            }
        });
    }
    
    // Animation loop
    function animate() {
        if (!isInitialized) return;
        
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Update animation mixers (for loaded models)
        mixers.forEach(mixer => mixer.update(delta));
        
        // Update glove positions based on tracking
        updateGloves(delta);
        
        // Update punch animations
        updatePunchAnimations(delta);
        
        // Subtle idle animation
        updateIdleAnimation();
        
        renderer.render(scene, camera);
    }
    
    function updateGloves(delta) {
        // Left glove
        if (leftHandData && leftGlove) {
            // Map hand position to glove position
            // X: -0.5 to 0.5 camera coords, Y: adjust height, Z: depth for punch
            const targetX = DEFAULT_POSITIONS.left.x + (leftHandData.position.x - 0.5) * 0.4;
            const targetY = DEFAULT_POSITIONS.left.y - (leftHandData.position.y - 0.5) * 0.4;
            
            // Depth affects z position (forward punch) - increased multiplier for more movement
            const depthOffset = -leftHandData.depth * 1.2;
            const targetZ = DEFAULT_POSITIONS.left.z + depthOffset;
            
            // Smooth interpolation (faster response)
            leftGlove.position.x += (targetX - leftGlove.position.x) * 0.2;
            leftGlove.position.y += (targetY - leftGlove.position.y) * 0.2;
            leftGlove.position.z += (targetZ - leftGlove.position.z) * 0.25;
            
            // Rotation based on position
            leftGlove.rotation.y = 0.2 + (leftHandData.position.x - 0.5) * 0.3;
        }
        
        // Right glove
        if (rightHandData && rightGlove) {
            const targetX = DEFAULT_POSITIONS.right.x + (rightHandData.position.x - 0.5) * 0.4;
            const targetY = DEFAULT_POSITIONS.right.y - (rightHandData.position.y - 0.5) * 0.4;
            
            // Depth affects z position (forward punch) - increased multiplier for more movement
            const depthOffset = -rightHandData.depth * 1.2;
            const targetZ = DEFAULT_POSITIONS.right.z + depthOffset;
            
            // Smooth interpolation (faster response)
            rightGlove.position.x += (targetX - rightGlove.position.x) * 0.2;
            rightGlove.position.y += (targetY - rightGlove.position.y) * 0.2;
            rightGlove.position.z += (targetZ - rightGlove.position.z) * 0.25;
            
            rightGlove.rotation.y = -0.2 + (rightHandData.position.x - 0.5) * 0.3;
        }
    }
    
    function updatePunchAnimations(delta) {
        // Left punch animation
        if (leftPunchAnimation.active && leftGlove) {
            leftPunchAnimation.progress += delta * 8; // Speed of punch
            
            if (leftPunchAnimation.progress < 1) {
                // Punch forward
                const punchZ = -Math.sin(leftPunchAnimation.progress * Math.PI) * 
                               PUNCH_DISTANCE * leftPunchAnimation.power;
                leftGlove.position.z = DEFAULT_POSITIONS.left.z + punchZ;
                
                // Slight rotation during punch
                leftGlove.rotation.x = 0.3 - Math.sin(leftPunchAnimation.progress * Math.PI) * 0.3;
            } else {
                leftPunchAnimation.active = false;
                leftPunchAnimation.progress = 0;
            }
        }
        
        // Right punch animation
        if (rightPunchAnimation.active && rightGlove) {
            rightPunchAnimation.progress += delta * 8;
            
            if (rightPunchAnimation.progress < 1) {
                const punchZ = -Math.sin(rightPunchAnimation.progress * Math.PI) * 
                               PUNCH_DISTANCE * rightPunchAnimation.power;
                rightGlove.position.z = DEFAULT_POSITIONS.right.z + punchZ;
                
                rightGlove.rotation.x = 0.3 - Math.sin(rightPunchAnimation.progress * Math.PI) * 0.3;
            } else {
                rightPunchAnimation.active = false;
                rightPunchAnimation.progress = 0;
            }
        }
    }
    
    function updateIdleAnimation() {
        if (!leftGlove || !rightGlove) return;
        
        const time = clock.getElapsedTime();
        
        // Subtle breathing/idle motion when not tracking
        if (!leftHandData && !leftPunchAnimation.active) {
            leftGlove.position.y = DEFAULT_POSITIONS.left.y + Math.sin(time * 2) * 0.02;
            leftGlove.position.x = DEFAULT_POSITIONS.left.x + Math.sin(time * 1.5) * 0.01;
            leftGlove.position.z = DEFAULT_POSITIONS.left.z + Math.sin(time * 1.8) * 0.01;
        }
        
        if (!rightHandData && !rightPunchAnimation.active) {
            rightGlove.position.y = DEFAULT_POSITIONS.right.y + Math.sin(time * 2 + 0.5) * 0.02;
            rightGlove.position.x = DEFAULT_POSITIONS.right.x + Math.sin(time * 1.5 + 0.5) * 0.01;
            rightGlove.position.z = DEFAULT_POSITIONS.right.z + Math.sin(time * 1.8 + 0.5) * 0.01;
        }
    }
    
    function onWindowResize() {
        if (!container || !camera || !renderer) return;
        
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    // Load a GLTF/GLB model (for Mixamo characters)
    async function loadModel(url, options = {}) {
        return new Promise((resolve, reject) => {
            if (typeof THREE.GLTFLoader === 'undefined') {
                console.warn('GLTFLoader not available. Include it to load Mixamo models.');
                reject(new Error('GLTFLoader not loaded'));
                return;
            }
            
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Setup animations if present
                    if (gltf.animations && gltf.animations.length > 0) {
                        const mixer = new THREE.AnimationMixer(model);
                        mixers.push(mixer);
                        
                        // Store animations on model for access
                        model.animations = gltf.animations;
                        model.mixer = mixer;
                    }
                    
                    // Apply options
                    if (options.scale) {
                        model.scale.setScalar(options.scale);
                    }
                    if (options.position) {
                        model.position.set(...options.position);
                    }
                    
                    resolve(model);
                },
                (progress) => {
                    console.log('Loading model:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }
    
    // Replace procedural gloves with loaded model
    async function setGloveModel(url, hand = 'both') {
        try {
            const model = await loadModel(url, { scale: 0.1 });
            
            if (hand === 'left' || hand === 'both') {
                if (leftGlove) camera.remove(leftGlove);
                leftGlove = model.clone();
                leftGlove.position.copy(new THREE.Vector3(
                    DEFAULT_POSITIONS.left.x,
                    DEFAULT_POSITIONS.left.y,
                    DEFAULT_POSITIONS.left.z
                ));
                camera.add(leftGlove);
            }
            
            if (hand === 'right' || hand === 'both') {
                if (rightGlove) camera.remove(rightGlove);
                rightGlove = model.clone();
                rightGlove.position.copy(new THREE.Vector3(
                    DEFAULT_POSITIONS.right.x,
                    DEFAULT_POSITIONS.right.y,
                    DEFAULT_POSITIONS.right.z
                ));
                rightGlove.scale.x *= -1; // Mirror for right hand
                camera.add(rightGlove);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load glove model:', error);
            return false;
        }
    }
    
    // Set opponent model
    async function setOpponentModel(url) {
        try {
            const model = await loadModel(url, { scale: 1, position: [0, 0, -2.5] });
            
            if (opponent) scene.remove(opponent);
            opponent = model;
            scene.add(opponent);
            
            return true;
        } catch (error) {
            console.error('Failed to load opponent model:', error);
            return false;
        }
    }
    
    // Get debug info
    function getDebugInfo() {
        return {
            leftGlovePos: leftGlove ? leftGlove.position.toArray() : null,
            rightGlovePos: rightGlove ? rightGlove.position.toArray() : null,
            leftPunching: leftPunchAnimation.active,
            rightPunching: rightPunchAnimation.active
        };
    }
    
    // Public API
    return {
        init,
        updateHandTracking,
        triggerPunch,
        loadModel,
        setGloveModel,
        setOpponentModel,
        getDebugInfo
    };
})();
