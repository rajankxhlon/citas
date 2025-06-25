// Initialize Firebase with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyB2mV0bya1fD17kQZQeMP11a9mlK-sVEnc",
  authDomain: "citas-bd0a3.firebaseapp.com",
  databaseURL: "https://citas-bd0a3-default-rtdb.firebaseio.com",
  projectId: "citas-bd0a3",
  storageBucket: "citas-bd0a3.firebasestorage.app",
  messagingSenderId: "1082213903517",
  appId: "1:1082213903517:web:22409e051e5442f37ef874",
  measurementId: "G-TXKMGDLMVB"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Get DOM elements
const loginToggle = document.getElementById('loginToggle');
const registerToggle = document.getElementById('registerToggle');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const createUsernameForm = document.getElementById('createUsernameForm');
const messageDiv = document.getElementById('message');
const loadingOverlay = document.getElementById('loadingOverlay'); // Get the loading overlay

// Login Form Elements
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');

// Register Form Elements
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Create Username Form Elements
const usernameInput = document.getElementById('username');

let currentForm = 'login'; // Track which form is active

// --- Helper Functions ---

function showMessage(msg, type = 'error') {
    messageDiv.textContent = msg;
    messageDiv.className = `message show ${type}`; // Reset classes and add new ones
    // Automatically hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

function showForm(formId) {
    // Hide all forms initially
    document.querySelectorAll('.form').forEach(form => {
        form.classList.remove('active');
        form.classList.add('hidden'); // Ensure it's hidden for display: none
    });

    // Show the requested form
    const formToShow = document.getElementById(formId);
    if (formToShow) {
        formToShow.classList.add('active');
        formToShow.classList.remove('hidden'); // Remove hidden if it was there
    }

    // Update active toggle button
    loginToggle.classList.remove('active');
    registerToggle.classList.remove('active');
    if (formId === 'loginForm') {
        loginToggle.classList.add('active');
        currentForm = 'login';
    } else if (formId === 'registerForm') {
        registerToggle.classList.add('active');
        currentForm = 'register';
    } else { // For createUsernameForm, neither toggle should be active
        // No specific toggle for username form, so just ensure others are inactive
    }
}

// --- Event Listeners for Form Toggles ---
loginToggle.addEventListener('click', () => showForm('loginForm'));
registerToggle.addEventListener('click', () => showForm('registerForm'));

// --- Authentication Logic ---

// Auto-login / Auth State Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is logged in
        console.log("User logged in:", user.email, user.uid);

        // Check if username exists for the user
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().username) {
            // User has a username, proceed to home page
            console.log("User has username. Redirecting to home.html");
            window.location.href = 'home.html';
        } else {
            // User does not have a username, show create username form
            console.log("User needs to create username.");
            showForm('createUsernameForm');
            loadingOverlay.classList.add('hidden'); // Hide loading screen
        }
    } else {
        // No user is logged in, show login/register forms
        console.log("No user logged in. Displaying login/register forms.");
        showForm(currentForm === 'register' ? 'registerForm' : 'loginForm'); // Show login or register form based on last active
        loadingOverlay.classList.add('hidden'); // Hide loading screen
    }
});


// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged will handle redirection
        // showMessage('Logged in successfully!', 'success'); // This message might not be seen due to redirect
    } catch (error) {
        console.error("Login error:", error.message);
        showMessage(error.message, 'error');
    }
});

// Register Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage('Password should be at least 6 characters.', 'error');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // After successful registration, show username creation form
        showMessage('Registration successful! Please create your username.', 'success');
        showForm('createUsernameForm');
        // The onAuthStateChanged listener will also trigger here, but we explicitly show username form
        // to guide the user immediately after registration.
    } catch (error) {
        console.error("Registration error:", error.message);
        showMessage(error.message, 'error');
    }
});

// Create Username Form Submission
createUsernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const user = auth.currentUser;

    if (!user) {
        showMessage('No user logged in. Please log in or register again.', 'error');
        return;
    }

    if (username.length < 3) {
        showMessage('Username must be at least 3 characters long.', 'error');
        return;
    }

    try {
        // Check if username already exists
        const usernameQuery = await db.collection('users').where('username', '==', username).get();
        if (!usernameQuery.empty) {
            showMessage('This username is already taken. Please choose another.', 'error');
            return;
        }

        // Add user data to Firestore, including username and initial status
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            username: username,
            isVerified: false, // Default to not verified
            status: 'online', // Set initial status to online
            lastSeen: firebase.firestore.FieldValue.serverTimestamp() // Set last seen timestamp
        }, { merge: true }); // Use merge to avoid overwriting if other data exists

        showMessage('Username created successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000); // Redirect after a short delay
    } catch (error) {
        console.error("Error creating username:", error.message);
        showMessage(error.message, 'error');
    }
});
