// Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyBpwRyAO9Hd0y06AFxQP2VJqiwucD02kHE',
    appId: '1:728424288022:web:3fc8d5379263ca3b99ca37',
    messagingSenderId: '728424288022',
    projectId: 'e-learning-3aef4',
    authDomain: 'e-learning-3aef4.firebaseapp.com',
    databaseURL: 'https://e-learning-3aef4-default-rtdb.firebaseio.com',
    storageBucket: 'e-learning-3aef4.firebasestorage.app',
    measurementId: 'G-GTTZ690T29',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const postsContainer = document.getElementById('posts-container');
const listBtn = document.getElementById('list-btn');
const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('overlay');
const logoutBtn = document.getElementById('logout-btn');

// Generate device ID for web
function getWebDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'web_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Function to handle logout
function logout(message) {
    // Save the message in sessionStorage to display it once after reload
    if (message) {
        sessionStorage.setItem('logoutMessage', message);
    }
    auth.signOut().then(() => {
        // Clear local storage and show login page
        localStorage.removeItem('deviceId');
        window.location.reload(); // Refresh the page to show the message
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

// Check auth state and listen to real-time changes
auth.onAuthStateChanged(user => {
    if (user) {
        const userId = user.uid;
        const deviceId = getWebDeviceId();
        const userRef = database.ref('users/' + userId);

        // Listen for real-time changes to the user's data
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();

            if (!userData) {
                logout('تم تسجيل خروجك لأن بيانات حسابك غير موجودة.');
                return;
            }

            // Check if the account is disabled
            if (userData.isDisabled) {
                logout('تم تسجيل خروجك لأن حسابك تم تعطيله.');
                return;
            }

            // Check for device changes or forced logout
            if (!userData.deviceId || userData.deviceId !== deviceId) {
                logout('تم تسجيل خروجك لأن حسابك تم تسجيل الدخول إليه من جهاز آخر.');
                return;
            }

            // If everything is correct, display dashboard
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            listBtn.classList.remove('hidden');

            // Load user data and posts
            loadPosts(userData.year);
        });

    } else {
        // No user is logged in
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        listBtn.classList.add('hidden');
        
        // Check for a saved logout message and display it
        const logoutMessage = sessionStorage.getItem('logoutMessage');
        if (logoutMessage) {
            alert(logoutMessage);
            sessionStorage.removeItem('logoutMessage');
        }

        // Stop listening to user data if user is logged out
        database.ref('users/' + auth.currentUser?.uid).off();
    }
});

// Login function
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const deviceId = getWebDeviceId();
    loginError.textContent = '';
    loginError.classList.add('hidden');

    try {
        // Step 1: Check Realtime Database for device and disable status before Firebase Auth
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            const userId = Object.keys(userData)[0];
            const userDetails = userData[userId];

            if (userDetails.isDisabled) {
                loginError.textContent = 'هذا الحساب معطل. يرجى التواصل مع الإدارة.';
                loginError.classList.remove('hidden');
                return;
            }

            if (userDetails.deviceId && userDetails.deviceId !== deviceId) {
                loginError.textContent = 'الحساب مسجل على جهاز آخر!';
                loginError.classList.remove('hidden');
                return;
            }
        }

        // Step 2: Proceed with Firebase Authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Step 3: Update device ID in database upon successful login if it's not set
        if (user) {
            await database.ref('users/' + user.uid).update({
                deviceId: deviceId,
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            loginError.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        } else if (error.code === 'auth/user-disabled') {
            loginError.textContent = 'هذا الحساب معطل. يرجى التواصل مع الإدارة.';
        } else {
            loginError.textContent = 'فشل تسجيل الدخول: تحقق من البيانات المدخلة.';
        }
        loginError.classList.remove('hidden');
    }
});

// Show/hide side menu
listBtn.addEventListener('click', () => {
    sideMenu.classList.add('show');
    overlay.classList.remove('hidden');
});

overlay.addEventListener('click', () => {
    sideMenu.classList.remove('show');
    overlay.classList.add('hidden');
});

// Logout button in side menu
logoutBtn.addEventListener('click', () => {
    logout();
});

// Load posts from database based on user's year
function loadPosts(year) {
    postsContainer.innerHTML = '<div class="post-card">جاري تحميل المنشورات...</div>';
    const postsRef = database.ref(`posts/${year}`);
    
    postsRef.on('value', (snapshot) => {
        const postsData = snapshot.val();
        postsContainer.innerHTML = '';

        if (!postsData) {
            postsContainer.innerHTML = '<div class="post-card">لا توجد منشورات حتى الآن!</div>';
            return;
        }

        const postsArray = Object.entries(postsData).map(([postId, post]) => ({
            postId,
            ...post
        })).sort((a, b) => b.timestamp - a.timestamp); // Use numeric comparison for timestamps

        postsArray.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });

        setupImageSliders();
    });
}

// Create post HTML element
function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';

    const userEmail = post.user.split('@')[0];
    const username = userEmail.charAt(0).toUpperCase() + userEmail.slice(1);
    const timestamp = formatTimestamp(post.timestamp);

    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-user">${username}</div>
            <div class="post-time">${timestamp}</div>
        </div>
        ${post.post ? `<div class="post-content">${post.post}</div>` : ''}
        ${post.images && post.images.length > 0 ? createPostImages(post.images) : ''}
        <div class="post-footer">
            <button class="like-btn" data-post-id="${post.postId}">
                <span class="material-icons">favorite_border</span>
                <span class="likes-count">${post.likes ? post.likes.length : 0}</span>
            </button>
        </div>
    `;

    const likeBtn = postElement.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => toggleLike(post.postId, post.year));

    const user = auth.currentUser;
    if (user && post.likes && post.likes.includes(user.email)) {
        likeBtn.classList.add('liked');
        likeBtn.innerHTML = `
            <span class="material-icons">favorite</span>
            <span class="likes-count">${post.likes.length}</span>
        `;
    }

    return postElement;
}

// Create images HTML for post
function createPostImages(images) {
    let imagesHTML = `
        <div class="post-images">
            <div class="post-images-container" style="width: ${images.length * 100}%">
    `;
    
    images.forEach((image, index) => {
        imagesHTML += `
            <div style="width: 100%; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                <img src="data:image/jpeg;base64,${image}" alt="Post image ${index + 1}" class="post-image" onload="this.style.opacity=1">
            </div>
        `;
    });
    
    imagesHTML += `
            </div>
            <div class="images-indicator">
                ${images.map((_, index) => `
                    <div class="indicator-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                `).join('')}
            </div>
        </div>
    `;
    
    return imagesHTML;
}

// Setup image sliders functionality with reversed dots order
function setupImageSliders() {
    document.querySelectorAll('.post-images').forEach(imagesContainer => {
        const container = imagesContainer.querySelector('.post-images-container');
        const dotsContainer = imagesContainer.querySelector('.images-indicator');
        const dots = Array.from(imagesContainer.querySelectorAll('.indicator-dot'));
        const imageCount = dots.length;
        let currentIndex = 0;
        let startX, moveX;
        let isDragging = false;

        container.style.direction = 'ltr';
        container.style.display = 'flex';
        container.style.width = `${imageCount * 100}%`;
        
        if (dotsContainer) {
            dots.reverse().forEach(dot => dotsContainer.appendChild(dot));
        }
        
        updateSliderPosition();

        imagesContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            container.style.transition = 'none';
        });

        imagesContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            moveX = e.touches[0].clientX;
            const diff = moveX - startX;
            const translateX = -currentIndex * 100 + (diff / imagesContainer.offsetWidth) * 100;
            container.style.transform = `translateX(${translateX}%)`;
        });

        imagesContainer.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            container.style.transition = 'transform 0.3s ease';
            const diff = moveX - startX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentIndex > 0) {
                    currentIndex--;
                } else if (diff < 0 && currentIndex < imageCount - 1) {
                    currentIndex++;
                }
            }
            
            updateSliderPosition();
        });

        imagesContainer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = true;
            container.style.transition = 'none';
            e.preventDefault();
        });

        imagesContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            moveX = e.clientX;
            const diff = moveX - startX;
            const translateX = -currentIndex * 100 + (diff / imagesContainer.offsetWidth) * 100;
            container.style.transform = `translateX(${translateX}%)`;
        });

        imagesContainer.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            container.style.transition = 'transform 0.3s ease';
            const diff = moveX - startX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentIndex > 0) {
                    currentIndex--;
                } else if (diff < 0 && currentIndex < imageCount - 1) {
                    currentIndex++;
                }
            }
            
            updateSliderPosition();
        });

        function updateSliderPosition() {
            container.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            dots.forEach((dot, index) => {
                if ((imageCount - 1 - index) === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    });
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Unknown time';
    
    return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Toggle like on post
async function toggleLike(postId) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = database.ref('users/' + user.uid);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const userYear = userData.year;

    const postRef = database.ref(`posts/${userYear}/${postId}`);
    const snapshot = await postRef.once('value');
    const postData = snapshot.val();

    if (postData) {
        const likes = postData.likes || [];
        const userEmail = user.email;
        const postElement = document.querySelector(`.like-btn[data-post-id="${postId}"]`).closest('.post-card');
        const likeBtn = postElement.querySelector('.like-btn');
        const likesCountSpan = postElement.querySelector('.likes-count');
        const likeIcon = postElement.querySelector('.material-icons');

        if (likes.includes(userEmail)) {
            const newLikes = likes.filter(email => email !== userEmail);
            await postRef.update({ likes: newLikes });
            likesCountSpan.textContent = newLikes.length;
            likeBtn.classList.remove('liked');
            likeIcon.textContent = 'favorite_border';
        } else {
            likes.push(userEmail);
            await postRef.update({ likes: likes });
            likesCountSpan.textContent = likes.length;
            likeBtn.classList.add('liked');
            likeIcon.textContent = 'favorite';

            const interactionsRef = database.ref('interactions');
            await interactionsRef.push({
                userId: user.uid,
                type: 'like',
                postId: postId,
                timestamp: new Date().toISOString(),
                userEmail: userEmail,
                postContent: postData.post || ''
            });
        }
    }
}

window.onload = function() {
    document.querySelectorAll('.post-image').forEach(img => {
        img.style.opacity = '1';
    });
};

// ======================================
// أكواد منع فحص العنصر
// ======================================

// منع النقر بزر الماوس الأيمن
document.addEventListener('contextmenu', event => event.preventDefault());

// منع اختصارات لوحة المفاتيح
document.addEventListener('keydown', event => {
    // F12 key
    if (event.key === 'F12') {
        event.preventDefault();
    }
    // Ctrl+Shift+I (Windows)
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
    }
    // Ctrl+Shift+J (Windows)
    if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
    }
    // Ctrl+U (View Page Source)
    if (event.ctrlKey && event.key === 'U') {
        event.preventDefault();
    }
    // Cmd+Alt+I (Mac)
    if (event.metaKey && event.altKey && event.key === 'I') {
        event.preventDefault();
    }
    // Cmd+Alt+J (Mac)
    if (event.metaKey && event.altKey && event.key === 'J') {
        event.preventDefault();
    }
});

// منع النسخ والقص واللصق
document.addEventListener('copy', event => event.preventDefault());
document.addEventListener('cut', event => event.preventDefault());
document.addEventListener('paste', event => event.preventDefault());