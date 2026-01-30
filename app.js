const container = document.getElementById('container');
const backImage = document.getElementById('backImage');
const voiceBar = document.getElementById('voiceBar');
const voiceBarText = document.getElementById('voiceBarText');
const carePlanOverlay = document.getElementById('carePlanOverlay');
const cardsTrack = document.getElementById('cardsTrack');
const dismissPlan = document.getElementById('dismissPlan');

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

    if (relY < 15) vertical = 'upper neck/head';
    else if (relY < 30) vertical = 'upper back/shoulders';
    else if (relY < 50) vertical = 'mid back';
    else if (relY < 70) vertical = 'lower back';
    else vertical = 'lower back/tailbone';

    if (relX < 35) horizontal = 'left side';
    else if (relX > 65) horizontal = 'right side';
    else horizontal = 'center/spine';

    return {
        region: `${vertical} (${horizontal})`,
        relativeX: relX.toFixed(1),
        relativeY: relY.toFixed(1)
    };
}

// Click on back to mark pain points
container.addEventListener('click', (e) => {
    if (e.target.closest('.label-bubble') || e.target.closest('.voice-orb-container') || e.target.closest('.care-plan-overlay')) return;

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

    const regionName = location.region.replace('/', ' / ');
    bubble.innerHTML = `<span class="bubble-text">${regionName}</span>`;

    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';

    container.appendChild(bubble);

    setTimeout(() => {
        bubble.classList.add('popping');
        bubble.addEventListener('animationend', () => {
            bubble.remove();
        });
    }, 2000);
}

// Voice bar functionality
voiceBar.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});

const defaultText = 'How have you tried to heal your back so far?';

function startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        voiceBarText.textContent = 'Speech not supported. Try Chrome.';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    orbRecognition = new SpeechRecognition();
    orbRecognition.continuous = true;
    orbRecognition.interimResults = true;

    orbTranscript = '';

    orbRecognition.onstart = () => {
        isListening = true;
        voiceBar.classList.add('listening');
        voiceBarText.textContent = 'Listening...';
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
        voiceBarText.textContent = orbTranscript + interim || 'Listening...';
    };

    orbRecognition.onerror = (event) => {
        voiceBarText.textContent = 'Error: ' + event.error;
        stopListening();
    };

    orbRecognition.onend = () => {
        isListening = false;
        voiceBar.classList.remove('listening');

        if (orbTranscript.trim()) {
            voiceBarText.textContent = 'Creating your plan...';
            generateCarePlan(orbTranscript.trim());
        } else {
            voiceBarText.textContent = defaultText;
        }
    };

    orbRecognition.start();
}

function stopListening() {
    if (orbRecognition) {
        orbRecognition.stop();
        isListening = false;
        voiceBar.classList.remove('listening');
    }
}

async function generateCarePlan(userInput) {
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
                generateCarePlan(userInput);
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
        voiceBarText.textContent = defaultText;

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
