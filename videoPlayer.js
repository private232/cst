// videoPlayer.js

const videoPlayer = (() => {
    let player = null;
    let currentTitle = '';
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const seekAmount = 10; 

    // جلب العناصر الأساسية
    const getElement = (id) => document.getElementById(id);
    const videoPlayerScreen = getElement('video-player-screen');
    const overlay = document.querySelector('.video-overlay-controls');

    // =======================================================
    // === وظائف الحماية ضد التقاط الشاشة (Anti-Screencap) ===
    // =======================================================
    let lastTimeHidden = 0;

    function handleVisibilityChange() {
        if (!player || !videoPlayerScreen) return;

        if (document.hidden) {
            // 🛑 الحالة 1: إخفاء الشاشة وتنبيه أمني
            player.pause();
            
            // إخفاء المحتوى الفعلي وعرض رسالة أمنية
            videoPlayerScreen.style.backgroundColor = 'black';
            videoPlayerScreen.innerHTML = `
                <div style="
                    color: white; 
                    font-size: 24px; 
                    text-align: center; 
                    margin: 50vh 20px 0; 
                    transform: translateY(-50%);
                ">
                    توقف الفيديو مؤقتاً. محاولات التسجيل أو الالتقاط محظورة.
                    <br><button onclick="videoPlayer.exitPlayer()" style="
                        margin-top: 15px; 
                        padding: 10px 20px; 
                        background: #dc3545; 
                        border: none; 
                        color: white; 
                        border-radius: 5px;
                        cursor: pointer;
                    ">إغلاق المشغل</button>
                </div>
            `;
            lastTimeHidden = Date.now();
            console.warn("Security Alert: Screen lost focus. Video paused.");
            
        } else {
            // 🔄 الحالة 2: إعادة البناء عند عودة التركيز
            const hiddenDuration = Date.now() - lastTimeHidden;
            
            // إعادة بناء هيكل المشغل في الـ DOM
            videoPlayerScreen.innerHTML = `
                <div class="video-player-content">
                     <video id="web-video-player" class="video-js vjs-default-skin" controls preload="auto" data-setup='{}' playsinline></video>
                </div>
                <div class="video-overlay-controls">
                    <div class="top-controls">
                        <button class="close-btn" onclick="videoPlayer.exitPlayer()">&#10005;</button>
                    </div>
                    </div>
            `;

            // إعادة التهيئة
            if (player) {
                const currentUrl = player.currentSrc();
                player.dispose(); // تفريغ المشغل القديم
                initializePlayer(currentUrl, currentTitle);
                
                if (hiddenDuration > 1000) {
                    // تنبيه المستخدم بعد اكتشاف محاولة تسجيل
                    alert('تم استئناف التشغيل. محاولة التقاط محتوى الفيديو مسجلة وغير مسموح بها.');
                }
            }
        }
    }

    function setupSecurityListeners() {
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    function removeSecurityListeners() {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }

    // =======================================================
    // === الدوال الأساسية للمشغل ===
    // =======================================================

    function initializePlayer(url, title) {
        if (player) {
            player.dispose(); 
            player = null; 
        }
        
        const videoContainer = getElement('web-video-player');
        if (!videoContainer) {
            console.error("Critical Error: #web-video-player element is missing.");
            return;
        }
        
        const parent = videoContainer.parentNode;
        const newVideoContainer = document.createElement('video');
        newVideoContainer.id = 'web-video-player';
        newVideoContainer.className = 'video-js vjs-default-skin';
        newVideoContainer.controls = true;
        newVideoContainer.preload = 'auto';
        newVideoContainer.setAttribute('data-setup', '{}');
        newVideoContainer.setAttribute('playsinline', '');

        // 🛑 الخصائص الأمنية القصوى (قد لا تعمل على iOS) 🛑
        newVideoContainer.setAttribute('data-nosniff', 'true'); 
        newVideoContainer.setAttribute('secure', 'true');
        newVideoContainer.style.setProperty('z-index', '99999'); 
        newVideoContainer.style.setProperty('transform', 'translateZ(0)');
        
        parent.replaceChild(newVideoContainer, videoContainer);
        
        const updatedVideoContainer = newVideoContainer;
        
        player = videojs(updatedVideoContainer, {
            autoplay: true, 
            controls: true,
            fluid: true,
            playbackRates: speeds, 
            sources: [{ 
                src: url, 
                type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' 
            }], 
        }, function() {
            console.log('Video player is ready.');
            
            if (this.qualitySelector) {
                this.qualitySelector({ defaultQuality: 'auto' });
            }
            addDoubleTapListener();
        });

        if (typeof logLectureAccess === 'function') {
            logLectureAccess(title); 
        }
        currentTitle = title;
    }
    
    function addDoubleTapListener() {
        let lastClickTime = 0;
        
        const overlayControls = document.querySelector('.video-overlay-controls');
        const seekLeftIndicator = getElement('seek-left-indicator');
        const seekRightIndicator = getElement('seek-right-indicator');

        if(overlayControls) overlayControls.style.pointerEvents = 'all'; 

        if (overlayControls) overlayControls.onclick = function(event) {
            // ... (منطق النقر المزدوج)
            if (player) player.userActive(true); 

            const now = Date.now();
            const delta = now - lastClickTime;
            lastClickTime = now;
            
            if (delta > 50 && delta < 350) {
                event.stopPropagation(); 
                
                const clickX = event.clientX;
                const videoRect = player.el().getBoundingClientRect();
                const relativeX = clickX - videoRect.left;
                const videoWidth = videoRect.width;

                if (relativeX > videoWidth / 2) {
                    player.currentTime(player.currentTime() - seekAmount); 
                    if(seekLeftIndicator) seekLeftIndicator.classList.add('show');
                    setTimeout(() => { if(seekLeftIndicator) seekLeftIndicator.classList.remove('show'); }, 500); 
                } else {
                    player.currentTime(player.currentTime() + seekAmount); 
                    if(seekRightIndicator) seekRightIndicator.classList.add('show');
                    setTimeout(() => { if(seekRightIndicator) seekRightIndicator.classList.remove('show'); }, 500);
                }
                
                lastClickTime = 0; 
            }
        };

        if (player) player.on('dblclick', function(event) {
             event.preventDefault();
             event.stopPropagation();
        });
    }

    function openPlayer(url, title) {
        if (!url) {
            alert('رابط الفيديو غير متوفر.');
            return;
        }
        
        if (!videoPlayerScreen) {
             console.error("Error: #video-player-screen element is missing.");
             return;
        }
        videoPlayerScreen.style.display = 'block';

        if (typeof state !== 'undefined') state.currentScreen = 'video';
        
        setupSecurityListeners(); 

        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('Cannot lock orientation:', e));
        }

        initializePlayer(url, title);
    }

    function exitPlayer() {
        removeSecurityListeners(); 
        
        if (player) {
            player.pause();
            player.dispose(); 
            player = null;
        }
        
        const overlayControls = document.querySelector('.video-overlay-controls');
        if (overlayControls) overlayControls.style.pointerEvents = 'none'; 

        if (videoPlayerScreen) {
             videoPlayerScreen.style.display = 'none';
             // إعادة تهيئة المحتوى الداخلي لإعادة مؤشر التقديم/التأخير
             // هذا الجزء يفترض أنك وضعت مؤشرات التقديم/التأخير في index.html كما تم إرساله مسبقًا.
             videoPlayerScreen.innerHTML = `
                <div class="video-player-content">
                     <video id="web-video-player" class="video-js vjs-default-skin" controls preload="auto" data-setup='{}' playsinline></video>
                </div>
                `;
        }
        
        if (typeof state !== 'undefined') state.currentScreen = 'lectures';
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        
        if (typeof goBackToLectures === 'function') {
            goBackToLectures(); 
        }
    }

    return {
        openPlayer,
        exitPlayer,
    };
})();