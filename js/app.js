/**
 * Birthday Wish Web Application - Dynamic Renderer & Controller
 */

// VPS Data Store API Endpoint
const VPS_API_BASE = window.VPS_API_URL || "http://162.35.189.85/api";

// Default Fallback Wish Data
const DEFAULT_WISH_DATA = {
    name: "Mehwish",
    date: "27 May",
    gender: "girl", // "girl" or "boy"
    photo: "./images/unnamed.png",
    cardTitle: "To You!",
    cardSubTitle: "Happy Birthday",
    letterText: "Happy birthday 🥳🎂🥳 the day you came into my life I was not really attached to you, but day by day you became so close to my heart. I wish you all the happiness, joy, and success in the world! May all your dreams come true! 🎈🎂🎈 Don't be sad, always stay happy and keep smiling! 😌✨",
    themeColor: "#FF7882"
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

// Fetch Wish Data from URL params, VPS API (162.35.189.85), Firebase, or Scheduled Local List
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

    // 2. Database Fetch by ID (VPS Data Store API OR Firebase)
    if (wishId) {
        // Try VPS Data Store API (162.35.189.85)
        try {
            const vpsResponse = await fetch(`${VPS_API_BASE}/get.php?id=${encodeURIComponent(wishId)}`);
            if (vpsResponse.ok) {
                const json = await vpsResponse.json();
                if (json && json.status === 'success' && json.data) {
                    wishData = { ...DEFAULT_WISH_DATA, ...json.data };
                    console.log("Loaded wish data from VPS Data Store API (162.35.189.85):", wishData);
                    return;
                }
            }
        } catch (e) {
            console.log("VPS API check bypassed/failed, trying relative API or Firebase...", e);
            try {
                const relResponse = await fetch(`api/get.php?id=${encodeURIComponent(wishId)}`);
                if (relResponse.ok) {
                    const json = await relResponse.json();
                    if (json && json.status === 'success' && json.data) {
                        wishData = { ...DEFAULT_WISH_DATA, ...json.data };
                        return;
                    }
                }
            } catch (err) {}
        }

        // Try Firebase Database
        if (window.firebase && window.firebaseAppConfig && window.firebaseAppConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseAppConfig);
                }
                const db = firebase.database();
                const snapshot = await db.ref('wishes/' + wishId).once('value');
                if (snapshot.exists()) {
                    wishData = { ...DEFAULT_WISH_DATA, ...snapshot.val() };
                    console.log("Loaded wish data from Firebase:", wishData);
                    return;
                }
            } catch (err) {
                console.warn("Firebase fetch error:", err);
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

    // 4. Fallback Local Storage preview
    const localSaved = localStorage.getItem('last_created_wish');
    if (localSaved && !encodedData && !wishId) {
        try {
            const parsedLocal = JSON.parse(localSaved);
            wishData = { ...DEFAULT_WISH_DATA, ...parsedLocal };
            console.log("Loaded wish data from localStorage preview:", wishData);
            return;
        } catch (e) {}
    }
}

// Render dynamic elements into the DOM
function renderWishPage() {
    const gender = (wishData.gender || "girl").toLowerCase();
    const name = wishData.name || "Friend";
    const date = wishData.date || "27 May";
    const photo = wishData.photo || "./images/unnamed.png";
    const letter = wishData.letterText || DEFAULT_WISH_DATA.letterText;
    const cardTitle = wishData.cardTitle || "To You!";

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
    document.title = `Happy Birthday ${name}! 🎂`;

    // 1. Update Recipient Name Displays
    const nameElements = document.querySelectorAll('.recipient-name');
    nameElements.forEach(el => {
        el.textContent = name;
    });

    const mailBtnText = document.getElementById('mail-btn-text');
    if (mailBtnText) {
        mailBtnText.innerHTML = `Click Here ${name} <i class="fa-regular fa-envelope"></i>`;
    }

    const nameBadge = document.querySelector('.name span');
    if (nameBadge) {
        nameBadge.textContent = `Dear ${name}`;
    }

    const modalUserHeader = document.querySelector('.username');
    if (modalUserHeader) {
        const heartEmoji = gender === 'boy' ? '💙' : '💖';
        modalUserHeader.innerHTML = `To: ${name} ${heartEmoji}<span class="underline"></span>`;
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
    startDateAnimation(date);
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

// Modal open / close handlers
function setupModalEvents() {
    const mailBox = document.querySelector('#btn__letter');
    const boxmail = document.querySelector('.boxMail');
    const closeBtn = document.querySelector('.fa-xmark');

    if (mailBox && boxmail) {
        mailBox.onclick = function (e) {
            e.preventDefault();
            boxmail.classList.add('active');
        };
    }

    if (closeBtn && boxmail) {
        closeBtn.onclick = function () {
            boxmail.classList.remove('active');
        };
    }

    // Close when clicking outside card
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
});
