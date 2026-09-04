/**
 * Birthday Wish Web Application - Dynamic Renderer & Controller (Firebase Edition)
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
        
        // A. Try Firebase REST API
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

        // B. Try Firebase SDK
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
    }

    // 4. If no active birthday link or scheduled date matches today, load clean neutral empty state
    wishData = { ...DEFAULT_WISH_DATA };
    console.log("No active birthday found for today, displaying clean neutral template.");
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
