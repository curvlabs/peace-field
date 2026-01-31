const container = document.getElementById('container');
const backImage = document.getElementById('backImage');
const voiceOrb = document.getElementById('voiceOrb');
const orbHint = document.getElementById('orbHint');
const carePlanOverlay = document.getElementById('carePlanOverlay');
const cardsTrack = document.getElementById('cardsTrack');
const dismissPlan = document.getElementById('dismissPlan');

let isFirstClick = true;

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
let isListening = false;
let orbRecognition = null;
let orbTranscript = '';

// Map click position to body region
function getBodyRegion(x, y) {
    const rect = backImage.getBoundingClientRect();
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

// Click on back to mark pain points (only once)
container.addEventListener('click', (e) => {
    if (e.target.closest('.label-bubble') || e.target.closest('.voice-orb-container') || e.target.closest('.care-plan-overlay')) return;

    // Only allow one tap
    if (!isFirstClick) return;

    // Fade out the hurt prompt
    const hurtPrompt = document.querySelector('.hurt-prompt');
    if (hurtPrompt) {
        hurtPrompt.style.transition = 'opacity 0.5s ease-out';
        hurtPrompt.style.opacity = '0';
    }
    isFirstClick = false;

    const location = getBodyRegion(e.clientX, e.clientY);
    painPoints.push({
        x: e.clientX,
        y: e.clientY,
        ...location,
        timestamp: new Date().toISOString()
    });

    createRipple(e.clientX, e.clientY);
    createLabelBubble(e.clientX, e.clientY, location);
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

    bubble.innerHTML = `<span class="bubble-text">How're you treating your ${location.region} pain?</span><button class="bubble-arrow" onclick="openFormModal()"></button>`;

    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';

    container.appendChild(bubble);
    // Bubble persists - no timeout to remove it
}

// Voice orb functionality
voiceOrb.addEventListener('click', () => {
    if (isListening) {
        stopOrbListening();
    } else {
        startOrbListening();
    }
});

function startOrbListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        orbHint.textContent = 'Speech not supported. Try Chrome.';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    orbRecognition = new SpeechRecognition();
    orbRecognition.continuous = true;
    orbRecognition.interimResults = true;

    orbTranscript = '';

    orbRecognition.onstart = () => {
        isListening = true;
        voiceOrb.classList.add('listening');
        orbHint.textContent = 'Listening...';
    };

    orbRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                orbTranscript += event.results[i][0].transcript + ' ';
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        orbHint.textContent = orbTranscript + interim || 'Listening...';
    };

    orbRecognition.onerror = (event) => {
        orbHint.textContent = 'Error: ' + event.error;
        stopOrbListening();
    };

    orbRecognition.onend = () => {
        isListening = false;
        voiceOrb.classList.remove('listening');

        if (orbTranscript.trim()) {
            orbHint.textContent = 'Creating your plan...';
            generateCarePlanFromOrb(orbTranscript.trim());
        } else {
            orbHint.textContent = 'Tap to speak';
        }
    };

    orbRecognition.start();
}

function stopOrbListening() {
    if (orbRecognition) {
        orbRecognition.stop();
        isListening = false;
        voiceOrb.classList.remove('listening');
    }
}

async function generateCarePlanFromOrb(userInput) {
    cardsTrack.innerHTML = '<div class="loading-orb">Creating your care plan...</div>';
    carePlanOverlay.classList.add('visible');

    const painContext = painPoints.length > 0
        ? painPoints.map(p => `- ${p.region}`).join('\n')
        : '- General back pain (no specific points marked)';

    const prompt = `You are a compassionate wellness advisor creating a progressive daily care plan for back pain.

PAIN LOCATIONS:
${painContext}

USER'S DESCRIPTION:
${userInput}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "exercises": [
    {
      "dayRange": "Days 1-3",
      "name": "Exercise name",
      "duration": "1-2 minutes",
      "frequency": "1x daily",
      "description": "Clear, simple instructions for doing this exercise",
      "imageSearch": "person doing [exercise name] stretch yoga"
    }
  ]
}

RULES:
- Create exactly 4 exercises in a progressive sequence
- Each exercise max 2 minutes, 1x per day
- Day ranges should progress: Days 1-3, Days 4-7, Days 8-14, Days 15+
- Start gentle, build intensity over time
- imageSearch should be a search query to find a photo of someone doing this exercise
- Keep descriptions concise but clear enough to follow`;

    const apiKey = localStorage.getItem('gemini_api_key');

    if (!apiKey) {
        cardsTrack.innerHTML = `
            <div class="api-key-prompt">
                <p>Enter your Gemini API key:</p>
                <input type="password" id="apiKeyInput" placeholder="API key" />
                <button id="saveApiKey">Save</button>
                <p class="api-key-help"><a href="https://makersuite.google.com/app/apikey" target="_blank">Get a free key</a></p>
            </div>
        `;

        document.getElementById('saveApiKey').addEventListener('click', () => {
            const key = document.getElementById('apiKeyInput').value;
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                generateCarePlanFromOrb(userInput);
            }
        });
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'API error');
        }

        let responseText = '';
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
        }

        if (!responseText) {
            throw new Error('No response from AI');
        }

        // Clean JSON
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
        else if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
        cleanJson = cleanJson.trim();

        const carePlan = JSON.parse(cleanJson);
        cardsTrack.innerHTML = renderCareCards(carePlan);
        orbHint.textContent = 'Tap to speak';

        // Start auto-scroll after cards animate in
        setTimeout(() => {
            startAutoScroll();
        }, 800);

    } catch (error) {
        console.error('Error:', error);
        cardsTrack.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        orbHint.textContent = 'Tap to try again';
    }
}

function renderCareCards(carePlan) {
    let html = '';

    carePlan.exercises.forEach((exercise, index) => {
        const imageUrl = `https://source.unsplash.com/320x200/?${encodeURIComponent(exercise.imageSearch)}`;

        html += `
            <div class="care-card">
                <img src="${imageUrl}" alt="${exercise.name}" class="care-card-image" loading="lazy">
                <div class="care-card-category">${exercise.dayRange}</div>
                <h3 class="care-card-name">${exercise.name}</h3>
                <div class="care-card-meta">${exercise.duration}</div>
            </div>
        `;
    });

    return html;
}

// Auto-scroll the cards slowly
let scrollInterval = null;
function startAutoScroll() {
    if (scrollInterval) clearInterval(scrollInterval);

    scrollInterval = setInterval(() => {
        if (cardsTrack.scrollLeft < cardsTrack.scrollWidth - cardsTrack.clientWidth) {
            cardsTrack.scrollLeft += 0.5;
        } else {
            cardsTrack.scrollLeft = 0;
        }
    }, 30);
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
}

// Dismiss plan button
dismissPlan.addEventListener('click', () => {
    carePlanOverlay.classList.remove('visible');
    stopAutoScroll();
});

// Pause auto-scroll when user interacts
cardsTrack.addEventListener('touchstart', stopAutoScroll);
cardsTrack.addEventListener('mousedown', stopAutoScroll);

// Form Modal functionality
const formModal = document.getElementById('formModal');
const formModalClose = document.getElementById('formModalClose');

window.openFormModal = function() {
    formModal.classList.add('visible');
}

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
