// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDbt4RVTt5v43b7t217lEbp4O4p0E7yErU",
    authDomain: "wann-market-7ad6f.firebaseapp.com",
    databaseURL: "https://wann-market-7ad6f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wann-market-7ad6f",
    storageBucket: "wann-market-7ad6f.firebasestorage.app",
    messagingSenderId: "202052121839",
    appId: "1:202052121839:web:fe02cb8b1c1a84fb2c571a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();