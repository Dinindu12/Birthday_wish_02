/**
 * Birthday Wish Web Application - Dynamic Renderer & Controller
 * FIXED: YouTube support as default music source
 */

// Neutral Empty Fallback Wish Data
const DEFAULT_WISH_DATA = {
    name: "",
    date: "",
    gender: "girl",
    photo: "./images/unnamed.png",
    cardTitle: "Happy Birthday!",
    cardSubTitle: "",
    letterText: "No active birthday wish found for today. Use the Admin Panel to create or schedule a new wish!",
    themeColor: "#FF7882",
    // 🎵 YouTube Video ID (for default background music)
    music: "yt:i8o956Fd-os"
};

let wishData = { ...DEFAULT_WISH_DATA };
let youtubePlayer = null;
let isYoutubePlaying = false;

// ===== SAFE LOCALSTORAGE SETTER =====
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('⚠️ ඔබගේ බ්‍රවුසරයේ ගබඩාව පිරී ඇත. කරුණාකර පැරණි දත්ත මකා දමන්න (F12 -> Application -> Clear Storage).');
            console.warn('Storage quota exceeded for key:', key);
        } else {
            console.error('Unexpected error while saving to localStorage:', e);
        }
    }
}

// Helper: decode URL safe Base64 string
function decodeWishData(encodedStr) {
    try {
        const jsonStr = decodeURIComponent(atob(encodedStr));
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse encoded wish data:", e);
        return null;
    }
}

// Get Firestore instance
function getFirestore() {
    if (!window.firebase) {
        console.error("Firebase SDK not loaded!");
        return null;
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseAppConfig);
    }
    return firebase.firestore();
}

// Helper: Get active scheduled birthdays from localStorage
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
            safeSetItem('scheduled_birthdays', activeList);
        }
        return activeList;
    } catch (e) {
        return [];
    }
}

// Fetch Wish Data from Firestore, URL Base64, or Scheduled Local List
async function loadWishData() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    const wishId = urlParams.get('id');

    // 1. Direct Base64 Data URL Mode
    if (encodedData) {
        const parsed = decodeWishData(encodedData);
        if (parsed) {
            wishData = { ...DEFAULT_WISH_DATA, ...parsed };
            console.log("✅ Loaded wish data from URL params:", wishData);
            return;
        }
    }

    // 2. Fetch from Cloud Firestore by ID
    if (wishId) {
        const db = getFirestore();
        if (db) {
            try {
                const docRef = db.collection('wishes').doc(wishId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    wishData = { ...DEFAULT_WISH_DATA, ...docSnap.data() };
                    console.log("✅ Loaded wish data from Cloud Firestore:", wishData);
                    return;
                } else {
                    console.log("No such Firestore document!");
                }
            } catch (err) {
                console.warn("Firestore fetch error:", err);
                
                const localSaved = localStorage.getItem('last_created_wish');
                if (localSaved) {
                    try {
                        const parsedLocal = JSON.parse(localSaved);
                        wishData = { ...DEFAULT_WISH_DATA, ...parsedLocal };
                        console.log("✅ Loaded wish data from localStorage (fallback):", wishData);
                        return;
                    } catch (e) {}
                }

                const activeScheduled = getActiveScheduledBirthdays();
                if (activeScheduled.length > 0) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayMatch = activeScheduled.find(item => item.targetDate === todayStr);
                    if (todayMatch) {
                        wishData = { ...DEFAULT_WISH_DATA, ...todayMatch };
                        console.log("✅ Loaded scheduled birthday matching TODAY:", wishData);
                        return;
                    }
                    const latestWish = activeScheduled[activeScheduled.length - 1];
                    if (latestWish) {
                        wishData = { ...DEFAULT_WISH_DATA, ...latestWish };
                        console.log("✅ Loaded latest active scheduled wish:", wishData);
                        return;
                    }
                }
            }
        }
    }

    // 3. Auto-Show Scheduled Birthday
    const activeScheduled = getActiveScheduledBirthdays();
    if (activeScheduled.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMatch = activeScheduled.find(item => item.targetDate === todayStr);
        if (todayMatch) {
            wishData = { ...DEFAULT_WISH_DATA, ...todayMatch };
            console.log("✅ Loaded scheduled birthday matching TODAY:", wishData);
            return;
        }
        const latestWish = activeScheduled[activeScheduled.length - 1];
        if (latestWish) {
            wishData = { ...DEFAULT_WISH_DATA, ...latestWish };
            console.log("✅ Loaded latest active scheduled wish:", wishData);
            return;
        }
    }

    // 4. Fallback localStorage preview
    const localSaved = localStorage.getItem('last_created_wish');
    if (localSaved && !encodedData && !wishId) {
        try {
            const parsedLocal = JSON.parse(localSaved);
            wishData = { ...DEFAULT_WISH_DATA, ...parsedLocal };
            console.log("✅ Loaded wish data from localStorage preview:", wishData);
            return;
        } catch (e) {}
    }

    wishData = { ...DEFAULT_WISH_DATA };
    console.log("⚠️ No wish data found. Using default.");
}

// Render dynamic elements into the DOM
function renderWishPage() {
    const gender = (wishData.gender || "girl").toLowerCase();
    const name = wishData.name || "";
    const date = wishData.date || "";
    const photo = wishData.photo || "./images/unnamed.png";
    const letter = wishData.letterText || DEFAULT_WISH_DATA.letterText;
    const cardTitle = wishData.cardTitle || "Happy Birthday!";

    document.body.classList.remove('theme-girl', 'theme-boy');
    if (gender === 'boy') {
        document.body.classList.add('theme-boy');
    } else {
        document.body.classList.add('theme-girl');
    }

    if (wishData.themeColor) {
        document.documentElement.style.setProperty('--color-theme', wishData.themeColor);
        document.documentElement.style.setProperty('--color-heart', wishData.themeColor);
        document.documentElement.style.setProperty('--color-text-pink', wishData.themeColor);
    }

    document.title = name ? `Happy Birthday ${name}! 🎂` : "Happy Birthday! 🎂";

    // Update recipient name
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

    // Profile photos
    const profileImgs = document.querySelectorAll('.profile-photo');
    profileImgs.forEach(img => {
        img.src = photo;
        img.onerror = () => {
            img.src = "./images/unnamed.png";
        };
    });

    // Modal letter card
    const card2Header = document.querySelector('.card2-content h3');
    if (card2Header) {
        card2Header.textContent = cardTitle;
    }
    const card2Body = document.querySelector('.card2-content h2');
    if (card2Body) {
        card2Body.textContent = letter;
    }

    // Circle text
    setupCircleText(`happy - birthday - `);

    // Date animation
    if (date) {
        startDateAnimation(date);
    } else {
        const dateContainer = document.querySelector(".date__of__birth span");
        if (dateContainer) dateContainer.textContent = "Special Day";
    }

    setupAudioPlayer();
}

// Circular rotating text
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

// Typewriter Date Animation
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
   🎵 YOUTUBE + MP3 AUDIO CONTROLLER (HYBRID)
   ========================================================= */

// Check if URL is a YouTube video ID (format: yt:VIDEO_ID)
function isYouTubeUrl(url) {
    return typeof url === 'string' && url.startsWith('yt:');
}

// Extract YouTube video ID from yt:VIDEO_ID format
function getYouTubeVideoId(url) {
    return url.replace('yt:', '');
}

// Create hidden YouTube iframe player
function createYouTubePlayer(videoId) {
    // Remove any existing YouTube player
    const existingPlayer = document.getElementById('youtube-player-container');
    if (existingPlayer) {
        existingPlayer.remove();
    }

    const container = document.createElement('div');
    container.id = 'youtube-player-container';
    container.style.position = 'fixed';
    container.style.bottom = '-100px';
    container.style.left = '-100px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    
    const iframe = document.createElement('iframe');
    iframe.id = 'youtube-player';
    iframe.width = '1';
    iframe.height = '1';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=0&loop=1&playlist=${videoId}&enablejsapi=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = false;
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    return iframe;
}

function setupAudioPlayer() {
    const audio = document.getElementById('bg-music');
    if (!audio) return;

    const musicUrl = wishData.music || DEFAULT_WISH_DATA.music;

    // Check if it's a YouTube URL
    if (isYouTubeUrl(musicUrl)) {
        const videoId = getYouTubeVideoId(musicUrl);
        console.log("🎵 Loading YouTube video:", videoId);
        
        // Hide the audio element (we'll use YouTube instead)
        audio.style.display = 'none';
        
        // Create YouTube player
        const iframe = createYouTubePlayer(videoId);
        
        // Store reference for play/pause
        youtubePlayer = iframe;
        isYoutubePlaying = false;
        
        console.log("✅ YouTube player ready");
        return;
    }

    // Regular MP3 audio (fallback)
    audio.style.display = '';
    const fallbackUrl = "https://youtu.be/i8o956Fd-os?si=NL95PFhFsZcJM12d";
    const audioUrl = musicUrl || fallbackUrl;

    audio.preload = "auto";

    if (audio.src !== audioUrl) {
        audio.src = audioUrl;
    }

    let fallbackAttempted = false;
    audio.onerror = function() {
        if (!fallbackAttempted && audio.src !== fallbackUrl) {
            console.warn("Primary audio failed, trying fallback...");
            fallbackAttempted = true;
            audio.src = fallbackUrl;
            audio.onerror = null;
        } else {
            console.warn("Fallback audio also failed.");
        }
    };

    audio.oncanplaythrough = function() {
        audio.onerror = null;
        console.log("✅ Audio loaded successfully.");
    };
}

function playWishAudioAndEffects() {
    // Try YouTube first
    if (youtubePlayer) {
        try {
            // Reload iframe to start playing (since we can't control via JS easily without YouTube API)
            // We'll use a simple approach: reload the iframe with autoplay=1
            const videoId = getYouTubeVideoId(wishData.music || DEFAULT_WISH_DATA.music);
            const iframe = document.getElementById('youtube-player');
            if (iframe) {
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&loop=1&playlist=${videoId}&enablejsapi=1`;
                isYoutubePlaying = true;
                console.log("🎵 YouTube video playing");
            }
        } catch (e) {
            console.warn("YouTube play error:", e);
        }
    }

    // Also try regular audio (as fallback or additional)
    const audio = document.getElementById('bg-music');
    if (audio && audio.src) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn("Auto audio play blocked:", e);
        });
    }

    triggerSkySticksBurst();
}

function stopWishAudio() {
    // Stop YouTube
    if (youtubePlayer) {
        try {
            const iframe = document.getElementById('youtube-player');
            if (iframe) {
                const videoId = getYouTubeVideoId(wishData.music || DEFAULT_WISH_DATA.music);
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=0&loop=1&playlist=${videoId}&enablejsapi=1`;
                isYoutubePlaying = false;
                console.log("⏸️ YouTube video paused");
            }
        } catch (e) {
            console.warn("YouTube pause error:", e);
        }
    }

    // Stop regular audio
    const audio = document.getElementById('bg-music');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

// Modal open / close handlers
function setupModalEvents() {
    const mailBox = document.querySelector('#btn__letter');
    const boxmail = document.querySelector('.boxMail');
    const closeBtn = document.querySelector('.fa-xmark');

    if (mailBox && boxmail) {
        mailBox.onclick = function (e) {
            e.preventDefault();
            boxmail.classList.add('active');
            playWishAudioAndEffects();
        };
    }
    if (closeBtn && boxmail) {
        closeBtn.onclick = function () {
            boxmail.classList.remove('active');
            stopWishAudio();
        };
    }
    if (boxmail) {
        boxmail.onclick = function (e) {
            if (e.target === boxmail) {
                boxmail.classList.remove('active');
                stopWishAudio();
            }
        };
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadWishData();
    renderWishPage();
    setupModalEvents();
    initSkySticksCanvas();
});
