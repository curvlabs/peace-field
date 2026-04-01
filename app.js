import * as THREE from 'three';

const container = document.getElementById('container');
const canvas = document.getElementById('backCanvas');
const introVideo = document.getElementById('introVideo');
const formModal = document.getElementById('formModal');
const formModalClose = document.getElementById('formModalClose');

// --- Three.js setup ---
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

// Texture will be set from the video's last frame
const texture = new THREE.Texture();
texture.colorSpace = THREE.SRGBColorSpace;

// Subdivided plane for vertex displacement
const SEGMENTS = 128;
const geometry = new THREE.PlaneGeometry(2, 2, SEGMENTS, SEGMENTS);
const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Intro video flow ---
introVideo.play().catch(() => {
    // Autoplay blocked — try again on first user interaction
    const resumePlay = () => {
        introVideo.play();
        document.removeEventListener('click', resumePlay);
        document.removeEventListener('touchstart', resumePlay);
    };
    document.addEventListener('click', resumePlay);
    document.addEventListener('touchstart', resumePlay);
});

// Continuously capture the video frame so we always have the latest non-black frame
const captureCanvas = document.createElement('canvas');
let captureCtx = null;

function initCapture() {
    captureCanvas.width = introVideo.videoWidth;
    captureCanvas.height = introVideo.videoHeight;
    captureCtx = captureCanvas.getContext('2d');
}

introVideo.addEventListener('playing', initCapture);

// If video is already playing by the time this module loads, init capture now
if (!introVideo.paused && introVideo.videoWidth > 0) {
    initCapture();
}

// Capture every frame during playback
function captureFrame() {
    if (!introVideo.paused && !introVideo.ended && captureCtx) {
        captureCtx.drawImage(introVideo, 0, 0);
    }
    if (appState === 'loading') {
        requestAnimationFrame(captureFrame);
    }
}
requestAnimationFrame(captureFrame);

function onVideoEnded() {
    // Ensure capture context is ready (may have missed the playing event)
    if (!captureCtx && introVideo.videoWidth > 0) {
        initCapture();
    }

    // Capture the actual last frame — the video element still displays it even after 'ended'
    if (captureCtx) {
        captureCtx.drawImage(introVideo, 0, 0);
        // Bake soft edge fade into the texture
        const w = captureCanvas.width;
        const h = captureCanvas.height;
        captureCtx.globalCompositeOperation = 'destination-out';
        // Left fade
        const leftGrad = captureCtx.createLinearGradient(0, 0, w * 0.15, 0);
        leftGrad.addColorStop(0, 'rgba(0,0,0,1)');
        leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
        captureCtx.fillStyle = leftGrad;
        captureCtx.fillRect(0, 0, w * 0.15, h);
        // Right fade
        const rightGrad = captureCtx.createLinearGradient(w * 0.85, 0, w, 0);
        rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rightGrad.addColorStop(1, 'rgba(0,0,0,1)');
        captureCtx.fillStyle = rightGrad;
        captureCtx.fillRect(w * 0.85, 0, w * 0.15, h);
        // Bottom fade (starts at 91%)
        const bottomGrad = captureCtx.createLinearGradient(0, h * 0.91, 0, h);
        bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bottomGrad.addColorStop(1, 'rgba(0,0,0,1)');
        captureCtx.fillStyle = bottomGrad;
        captureCtx.fillRect(0, h * 0.91, w, h * 0.09);
        captureCtx.globalCompositeOperation = 'source-over';
    }
    texture.image = captureCanvas;
    texture.needsUpdate = true;

    const aspect = introVideo.videoWidth / introVideo.videoHeight;
    fitPlaneToScreen(aspect);

    // Show canvas on top, video stays paused underneath as fallback
    canvas.classList.add('visible');

    setTimeout(() => {
        appState = 'interactive';
        document.querySelector('.hurt-prompt').classList.add('visible');
        introVideo.classList.add('hidden');
    }, 600);
}

introVideo.addEventListener('ended', onVideoEnded);

// If video already ended before this module loaded, run the handler now
if (introVideo.ended) {
    onVideoEnded();
}

// Store original vertex positions
const posAttr = geometry.getAttribute('position');
const originalPositions = new Float32Array(posAttr.array);

// Active displacements: [{ centerX, centerY, strength, time }]
const displacements = [];
const TWITCH_RADIUS_X = 0.22;
const TWITCH_RADIUS_Y = 0.15;
const TWITCH_STRENGTH = 0.025;
const TWITCH_DURATION = 0.8;

function fitPlaneToScreen(imageAspect) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const containerAspect = w / h;

    renderer.setSize(w, h);

    // Scale mesh to image aspect ratio (plane is 2x2, texture would stretch without this)
    mesh.scale.set(imageAspect, 1, 1);

    // Camera frustum must match container aspect ratio to avoid distortion
    // Fit the scaled mesh inside (contain mode)
    if (imageAspect > containerAspect) {
        // Image wider than container — fit to width
        camera.left = -imageAspect;
        camera.right = imageAspect;
        camera.top = imageAspect / containerAspect;
        camera.bottom = -imageAspect / containerAspect;
    } else {
        // Image taller — fit to height
        camera.left = -containerAspect;
        camera.right = containerAspect;
        camera.top = 1;
        camera.bottom = -1;
    }
    camera.updateProjectionMatrix();
}

// --- App state ---
let appState = 'loading';

// Blue/lilac color palette
const colors = [
    { strong: 'rgba(147, 112, 219, 0.8)', medium: 'rgba(147, 112, 219, 0.5)', soft: 'rgba(147, 112, 219, 0.2)' },
    { strong: 'rgba(138, 143, 226, 0.8)', medium: 'rgba(138, 143, 226, 0.5)', soft: 'rgba(138, 143, 226, 0.2)' },
    { strong: 'rgba(100, 149, 237, 0.8)', medium: 'rgba(100, 149, 237, 0.5)', soft: 'rgba(100, 149, 237, 0.2)' },
    { strong: 'rgba(173, 152, 208, 0.8)', medium: 'rgba(173, 152, 208, 0.5)', soft: 'rgba(173, 152, 208, 0.2)' },
    { strong: 'rgba(123, 104, 238, 0.8)', medium: 'rgba(123, 104, 238, 0.5)', soft: 'rgba(123, 104, 238, 0.2)' },
    { strong: 'rgba(176, 196, 222, 0.8)', medium: 'rgba(176, 196, 222, 0.5)', soft: 'rgba(176, 196, 222, 0.2)' },
];

let painPoints = [];

// Map click position to body region
function getBodyRegion(x, y) {
    const rect = canvas.getBoundingClientRect();
    const relX = ((x - rect.left) / rect.width) * 100;
    const relY = ((y - rect.top) / rect.height) * 100;

    let vertical = '';
    let horizontal = '';

    if (relY < 12) vertical = 'neck';
    else if (relY < 28) vertical = 'upper back';
    else if (relY < 48) vertical = 'mid back';
    else if (relY < 68) vertical = 'lower back';
    else vertical = 'tailbone';

    if (relX < 35) horizontal = 'left';
    else if (relX > 65) horizontal = 'right';
    else horizontal = '';

    const region = horizontal ? `${horizontal} ${vertical}` : vertical;

    return {
        region: region,
        relativeX: relX.toFixed(1),
        relativeY: relY.toFixed(1)
    };
}

// --- Click handling ---
container.addEventListener('click', (e) => {
    if (e.target.closest('.label-bubble') || e.target.closest('.care-plan-overlay')) return;
    if (appState !== 'interactive') return;

    const hurtPrompt = document.querySelector('.hurt-prompt');
    if (hurtPrompt) hurtPrompt.classList.remove('visible');

    const location = getBodyRegion(e.clientX, e.clientY);
    painPoints.push({
        x: e.clientX,
        y: e.clientY,
        ...location,
        timestamp: new Date().toISOString()
    });

    // Trigger 3D twitch at click point
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    // Convert NDC to world coords via camera bounds, then to local coords (undo mesh scale)
    const worldX = THREE.MathUtils.mapLinear(ndcX, -1, 1, camera.left, camera.right);
    const worldY = THREE.MathUtils.mapLinear(ndcY, -1, 1, camera.bottom, camera.top);
    const localX = worldX / mesh.scale.x;
    const localY = worldY / mesh.scale.y;
    triggerTwitch(localX, localY);

    // Delay ripple so the twitch plays first
    setTimeout(() => createRipple(e.clientX, e.clientY), 400);
    // Label appears halfway through the ripple bloom (bloom is 2.5s, starts at 400ms)
    setTimeout(() => createLabelBubble(e.clientX, e.clientY, location), 1650);

    appState = 'bubble';
});

function triggerTwitch(cx, cy) {
    displacements.push({ centerX: cx, centerY: cy, strength: TWITCH_STRENGTH, time: 0 });
}

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Reset positions
    posAttr.array.set(originalPositions);

    // Apply active displacements
    for (let d = displacements.length - 1; d >= 0; d--) {
        const disp = displacements[d];
        disp.time += dt;

        if (disp.time > TWITCH_DURATION) {
            displacements.splice(d, 1);
            continue;
        }

        // Natural muscle twitch: quick contraction, slow release with gentle secondary pulse
        const t = disp.time / TWITCH_DURATION;
        // Fast rise (t^0.3), then slow exponential decay with one soft secondary pulse
        const envelope = Math.exp(-4 * t) * (1 + 0.3 * Math.sin(t * Math.PI * 2.5));
        const currentStrength = disp.strength * envelope;

        for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const dx = vx - disp.centerX;
            const dy = vy - disp.centerY;
            const normDist = Math.sqrt((dx / TWITCH_RADIUS_X) ** 2 + (dy / TWITCH_RADIUS_Y) ** 2);

            if (normDist < 1) {
                // Soft falloff — smooth skin-like spread
                const falloff = Math.exp(-2 * normDist * normDist);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0.001) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    posAttr.setX(i, vx + nx * currentStrength * falloff);
                    posAttr.setY(i, vy + ny * currentStrength * falloff);
                }
            }
        }
    }

    posAttr.needsUpdate = true;
    renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener('resize', () => {
    if (texture.image) {
        fitPlaneToScreen(texture.image.width / texture.image.height);
    }
});

// --- UI functions (ripple, bubble, form) ---
function createRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';

    const size = 200;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';

    const color = colors[Math.floor(Math.random() * colors.length)];
    ripple.style.setProperty('--ripple-color-strong', color.strong);
    ripple.style.setProperty('--ripple-color-medium', color.medium);
    ripple.style.setProperty('--ripple-color-soft', color.soft);

    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    container.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

function createLabelBubble(x, y, location) {
    const bubble = document.createElement('div');
    bubble.className = 'label-bubble';
    bubble.innerHTML = `<span class="bubble-text">Let's figure out your ${location.region} pain.</span><button class="bubble-arrow"></button>`;
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    container.appendChild(bubble);

    bubble.querySelector('.bubble-arrow').addEventListener('click', () => {
        bubble.classList.add('popping');
        bubble.addEventListener('animationend', () => {
            bubble.remove();
            showForm();
        });
    });
}

function showForm() {
    appState = 'form';
    formModal.classList.add('visible');
}

// Form Modal
function closeFormModal() {
    formModal.classList.remove('visible');
}

formModalClose.addEventListener('click', closeFormModal);
formModal.addEventListener('click', (e) => {
    if (e.target === formModal) closeFormModal();
});
