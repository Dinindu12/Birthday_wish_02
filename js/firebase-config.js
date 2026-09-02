// Firebase Configuration Template
// You can replace the credentials below with your own Firebase project credentials.
// If left as null/default, the app automatically uses encoded URL links & LocalStorage!

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Global Firebase initialization helper
window.firebaseAppConfig = firebaseConfig;
