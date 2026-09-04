/**
 * Birthday Wish Web Application - Dynamic Renderer & Controller (Firebase & SkySticks Edition)
 */

// Neutral Empty Fallback Wish Data (No hardcoded names/texts)
const DEFAULT_WISH_DATA = {
    name: "",
    date: "",
    gender: "girl", // "girl" or "boy"
    photo: "./images/unnamed.png",
    cardTitle: "Happy Birthday!",
    cardSubTitle: "",
    letterText: "No active birthday wish found for today. Use the Admin Panel to create or schedule a new wish!",
    themeColor: "#FF7882",
    music: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
};

// Current Wish State
let wishData = { ...DEFAULT_WISH_DATA };

// Helper function to decode URL safe Base64 string
function decodeWishData(encodedStr) {
    try {
        const jsonStr = decodeURIComponent(atob(encodedStr));
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse encoded wish data:", e);
        return null;
    }
}

// Get active Firebase Realtime Database URL
function getFirebaseDatabaseUrl() {
    const localDbUrl = localStorage.getItem('firebase_db_url');
    if (localDbUrl && localDbUrl.trim() !== "") {
        return localDbUrl.trim().replace(/\/+$/, '');
    }
    if (window.firebaseAppConfig && window.firebaseAppConfig.databaseURL && !window.firebaseAppConfig.databaseURL.includes('YOUR_PROJECT_ID')) {
        return window.firebaseAppConfig.databaseURL.trim().replace(/\/+$/, '');
    }
    return null;
}

// Helper to retrieve active scheduled birthdays and purge expired items (> 24h past target date)
function getActiveScheduledBirthdays() {
    const raw = localStorage.getItem('scheduled_birthdays');
    if (!raw) return [];
    try {
        const list = JSON.parse(raw);
        const now = new Date();
        
        const activeList = list.filter(item => {
            if (!item.targetDate) return true;
            const targetEnd = new Date(item.targetDate + "T23:59:59");
            const hoursPast = (now - targetEnd) / (1000 * 60 * 60);
            return hoursPast <= 24;
        });

        if (activeList.length !== list.length) {
            localStorage.setItem('scheduled_birthdays', JSON.stringify(activeList));
        }

        return activeList;
    } catch (e) {
        return [];
    }
}

// Fetch Wish Data from Firebase Realtime Database, URL base64, or Scheduled Local List
async function loadWishData() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    const wishId = urlParams.get('id');

    // 1. Direct Base64 Data URL Mode
    if (encodedData) {
        const parsed = decodeWishData(encodedData);
        if (parsed) {
            wishData = { ...DEFAULT_WISH_DATA, ...parsed };
            console.log("Loaded wish data from URL params:", wishData);
            return;
        }
    }

    // 2. Fetch from Firebase Realtime Database by ID (REST API & SDK)
    if (wishId) {
        const fbUrl = getFirebaseDatabaseUrl();
        
        if (fbUrl) {
            try {
                const restEndpoint = `${fbUrl}/wishes/${encodeURIComponent(wishId)}.json`;
                const response = await fetch(restEndpoint);
                if (response.ok) {
                    const json = await response.json();
                    if (json) {
                        wishData = { ...DEFAULT_WISH_DATA, ...json };
                        console.log("Loaded wish data from Firebase REST API:", wishData);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Firebase REST fetch error:", e);
            }
        }

        if (window.firebase && window.firebaseAppConfig && window.firebaseAppConfig.databaseURL) {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseAppConfig);
                }
                const db = firebase.database();
                const snapshot = await db.ref('wishes/' + wishId).once('value');
                if (snapshot.exists()) {
                    wishData = { ...DEFAULT_WISH_DATA, ...snapshot.val() };
                    console.log("Loaded wish data from Firebase SDK:", wishData);
                    return;
                }
            } catch (err) {
                console.warn("Firebase SDK fetch error:", err);
            }
        }
    }

    // 3. Auto-Show Scheduled Birthday matching Today (YYYY-MM-DD)
    const activeScheduled = getActiveScheduledBirthdays();
    if (activeScheduled.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const todayMatch = activeScheduled.find(item => item.targetDate === todayStr);
        if (todayMatch) {
            wishData = { ...DEFAULT_WISH_DATA, ...todayMatch };
            console.log("Loaded scheduled birthday matching TODAY:", wishData);
            return;
        }

        const latestWish = activeScheduled[activeScheduled.length - 1];
        if (latestWish) {
            wishData = { ...DEFAULT_WISH_DATA, ...latestWish };
            console.log("Loaded latest active scheduled wish:", wishData);
            return;
        }
    }

    // 4. Fallback Local Storage preview or clean neutral state
    const localSaved = localStorage.getItem('last_created_wish');
    if (localSaved && !encodedData && !wishId) {
        try {
            const parsedLocal = JSON.parse(localSaved);
            wishData = { ...DEFAULT_WISH_DATA, ...parsedLocal };
            console.log("Loaded wish data from localStorage preview:", wishData);
            return;
        } catch (e) {}
    }

    wishData = { ...DEFAULT_WISH_DATA };
}

// Render dynamic elements into the DOM
function renderWishPage() {
    const gender = (wishData.gender || "girl").toLowerCase();
    const name = wishData.name || "";
    const date = wishData.date || "";
    const photo = wishData.photo || "./images/unnamed.png";
    const letter = wishData.letterText || DEFAULT_WISH_DATA.letterText;
    const cardTitle = wishData.cardTitle || "Happy Birthday!";

    // Apply gender theme class to body
    document.body.classList.remove('theme-girl', 'theme-boy');
    if (gender === 'boy') {
        document.body.classList.add('theme-boy');
    } else {
        document.body.classList.add('theme-girl');
    }

    // Custom background theme override if specified
    if (wishData.themeColor) {
        document.documentElement.style.setProperty('--color-theme', wishData.themeColor);
        document.documentElement.style.setProperty('--color-heart', wishData.themeColor);
        document.documentElement.style.setProperty('--color-text-pink', wishData.themeColor);
    }

    // Update document title
    document.title = name ? `Happy Birthday ${name}! 🎂` : "Happy Birthday! 🎂";

    // 1. Update Recipient Name Displays
    const nameElements = document.querySelectorAll('.recipient-name');
    nameElements.forEach(el => {
        el.textContent = name;
    });

    const mailBtnText = document.getElementById('mail-btn-text');
    if (mailBtnText) {
        if (name) {
            mailBtnText.innerHTML = `Click Here ${name} <i class="fa-regular fa-envelope"></i>`;
        } else {
            mailBtnText.innerHTML = `Click Here <i class="fa-regular fa-envelope"></i>`;
        }
    }

    const nameBadge = document.querySelector('.name span');
    if (nameBadge) {
        nameBadge.textContent = name ? `Dear ${name}` : "Happy Birthday";
    }

    const modalUserHeader = document.querySelector('.username');
    if (modalUserHeader) {
        const heartEmoji = gender === 'boy' ? '💙' : '💖';
        if (name) {
            modalUserHeader.innerHTML = `To: ${name} ${heartEmoji}<span class="underline"></span>`;
        } else {
            modalUserHeader.innerHTML = `To You ${heartEmoji}<span class="underline"></span>`;
        }
    }

    // 2. Update Profile Photos
    const profileImgs = document.querySelectorAll('.profile-photo');
    profileImgs.forEach(img => {
        img.src = photo;
        img.onerror = () => {
            img.src = "./images/unnamed.png";
        };
    });

    // 3. Update Modal Letter Card
    const card2Header = document.querySelector('.card2-content h3');
    if (card2Header) {
        card2Header.textContent = cardTitle;
    }

    const card2Body = document.querySelector('.card2-content h2');
    if (card2Body) {
        card2Body.textContent = letter;
    }

    // 4. Dynamic Circle Text ("happy - birthday - ")
    setupCircleText(`happy - birthday - `);

    // 5. Start Animated Date Typewriter Effect
    if (date) {
        startDateAnimation(date);
    } else {
        const dateContainer = document.querySelector(".date__of__birth span");
        if (dateContainer) dateContainer.textContent = "Special Day";
    }

    // 6. Setup Audio Player
    setupAudioPlayer();
}

// Generate circular rotating text dynamically
function setupCircleText(textStr) {
    const textContainer = document.querySelector('.text__cricle');
    if (!textContainer) return;

    textContainer.innerHTML = '';
    const chars = textStr.split('');
    const angleStep = 360 / chars.length;

    chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.setProperty('--i', index + 1);
        span.style.transform = `rotate(${index * angleStep}deg)`;
        textContainer.appendChild(span);
    });
}

// Dynamic Typewriter Date Animation
let dateInterval = null;
function startDateAnimation(dateStr) {
    const dateContainer = document.querySelector(".date__of__birth span");
    if (!dateContainer) return;

    dateContainer.textContent = "";
    if (dateInterval) clearInterval(dateInterval);

    const charArr = dateStr.split('');
    let currentIndex = 0;

    setTimeout(() => {
        dateInterval = setInterval(() => {
            if (currentIndex < charArr.length) {
                dateContainer.textContent += charArr[currentIndex];
                currentIndex++;
            } else {
                clearInterval(dateInterval);
                const parent = document.querySelector(".date__of__birth");
                if (parent && !parent.querySelector('i')) {
                    const starLeft = document.createElement("i");
                    starLeft.className = "fa-solid fa-star";
                    parent.prepend(starLeft);

                    const starRight = document.createElement("i");
                    starRight.className = "fa-solid fa-star";
                    parent.appendChild(starRight);
                }
            }
        }, 120);
    }, 11000);
}

/* =========================================================
   SKY STICKS & FIREWORKS CANVAS ANIMATION ENGINE
   ========================================================= */
let canvas, ctx;
let rockets = [];
let particles = [];
let animId = null;

function initSkySticksCanvas() {
    canvas = document.getElementById('skysticks-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

class Rocket {
    constructor(x, targetY, color) {
        this.x = x;
        this.y = canvas ? canvas.height : window.innerHeight;
        this.targetY = targetY;
        this.speed = Math.random() * 4 + 8;
        this.color = color;
        this.size = 3;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        this.y -= this.speed;

        if (this.y <= this.targetY) {
            explodeRocket(this.x, this.y, this.color);
            return false;
        }
        return true;
    }

    draw() {
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const pt = this.trail[i];
            const alpha = i / this.trail.length;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(pt.x, pt.y, this.size, this.size * 4);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.x - 1, this.y, this.size + 2, this.size * 5);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08;
        this.alpha -= this.decay;
        return this.alpha > 0;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function explodeRocket(x, y, color) {
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnSkyStick() {
    if (!canvas) return;
    const x = Math.random() * (canvas.width * 0.8) + (canvas.width * 0.1);
    const targetY = Math.random() * (canvas.height * 0.4) + (canvas.height * 0.1);
    
    const isBoy = document.body.classList.contains('theme-boy');
    const colors = isBoy ? 
        ['#1E88E5', '#42A5F5', '#90CAF9', '#FFD700', '#FFFFFF', '#00E5FF'] : 
        ['#FF7882', '#FF5362', '#FFB6C1', '#FFD700', '#FFFFFF', '#FF4081'];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    rockets.push(new Rocket(x, targetY, color));
}

function animateSkySticks() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    rockets = rockets.filter(r => {
        const alive = r.update();
        if (alive) r.draw();
        return alive;
    });

    particles = particles.filter(p => {
        const alive = p.update();
        if (alive) p.draw();
        return alive;
    });

    animId = requestAnimationFrame(animateSkySticks);
}

function triggerSkySticksBurst() {
    initSkySticksCanvas();
    if (!animId) animateSkySticks();

    let count = 0;
    const interval = setInterval(() => {
        spawnSkyStick();
        count++;
        if (count >= 14) clearInterval(interval);
    }, 220);
}

/* =========================================================
   MP3 AUDIO MUSIC CONTROLLER
   ========================================================= */
function setupAudioPlayer() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-toggle-btn');
    if (!audio || !btn) return;

    const musicUrl = wishData.music || "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
    audio.src = musicUrl;

    btn.onclick = () => {
        if (audio.paused) {
            audio.play().then(() => {
                btn.classList.add('playing');
            }).catch(e => console.warn("Audio play blocked:", e));
        } else {
            audio.pause();
            btn.classList.remove('playing');
        }
    };
}

function playWishAudioAndEffects() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-toggle-btn');
    if (audio) {
        audio.play().then(() => {
            if (btn) btn.classList.add('playing');
        }).catch(e => console.warn("Auto audio play blocked:", e));
    }
    triggerSkySticksBurst();
}

// Modal open / close handlers & Event Trigger
function setupModalEvents() {
    const mailBox = document.querySelector('#btn__letter');
    const boxmail = document.querySelector('.boxMail');
    const closeBtn = document.querySelector('.fa-xmark');

    if (mailBox && boxmail) {
        mailBox.onclick = function (e) {
            e.preventDefault();
            boxmail.classList.add('active');
            
            // Trigger Music Playback & Sky Sticks Animation!
            playWishAudioAndEffects();
        };
    }

    if (closeBtn && boxmail) {
        closeBtn.onclick = function () {
            boxmail.classList.remove('active');
        };
    }

    if (boxmail) {
        boxmail.onclick = function (e) {
            if (e.target === boxmail) {
                boxmail.classList.remove('active');
            }
        };
    }
}

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadWishData();
    renderWishPage();
    setupModalEvents();
    initSkySticksCanvas();
});
