const container = document.getElementById('container');
const backVideo = document.getElementById('backVideo');
const formModal = document.getElementById('formModal');
const formModalClose = document.getElementById('formModalClose');

// App state: 'twitch' | 'interactive' | 'bubble' | 'strip' | 'form'
let appState = 'twitch';

// Play twitch video on load
backVideo.play();

// When video ends, check state and act accordingly
backVideo.addEventListener('ended', () => {
    if (appState === 'twitch') {
        // Twitch finished - show text overlay and allow clicks
        appState = 'interactive';
        document.querySelector('.hurt-prompt').classList.add('visible');
    } else if (appState === 'strip') {
        // Strip finished - show form modal
        appState = 'form';
        formModal.classList.add('visible');
    }
});

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
    const rect = backVideo.getBoundingClientRect();
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

    // Combine: "left lower back" or just "lower back" if center
    const region = horizontal ? `${horizontal} ${vertical}` : vertical;

    return {
        region: region,
        relativeX: relX.toFixed(1),
        relativeY: relY.toFixed(1)
    };
}

// Click on back to mark pain points (only when interactive)
container.addEventListener('click', (e) => {
    if (e.target.closest('.label-bubble') || e.target.closest('.care-plan-overlay')) return;

    // Only allow clicks in interactive state
    if (appState !== 'interactive') return;

    // Fade out the hurt prompt
    const hurtPrompt = document.querySelector('.hurt-prompt');
    if (hurtPrompt) {
        hurtPrompt.classList.remove('visible');
    }

    const location = getBodyRegion(e.clientX, e.clientY);
    painPoints.push({
        x: e.clientX,
        y: e.clientY,
        ...location,
        timestamp: new Date().toISOString()
    });

    createRipple(e.clientX, e.clientY);
    createLabelBubble(e.clientX, e.clientY, location);

    // Prevent further clicks
    appState = 'bubble';
});

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

    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

function createLabelBubble(x, y, location) {
    const bubble = document.createElement('div');
    bubble.className = 'label-bubble';

    // No arrow button - just the text
    bubble.innerHTML = `<span class="bubble-text">How're you treating your ${location.region} pain?</span>`;

    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';

    container.appendChild(bubble);

    // After delay, pop bubble and play strip video
    setTimeout(() => {
        bubble.classList.add('popping');
        bubble.addEventListener('animationend', () => {
            bubble.remove();
            playStripVideo();
        });
    }, 2500);
}

function playStripVideo() {
    appState = 'strip';
    backVideo.src = 'assets/strip.mp4';
    backVideo.load();
    backVideo.play();
}

// Form Modal functionality
function closeFormModal() {
    formModal.classList.remove('visible');
}

formModalClose.addEventListener('click', closeFormModal);

// Close modal when clicking outside the content
formModal.addEventListener('click', (e) => {
    if (e.target === formModal) {
        closeFormModal();
    }
});
