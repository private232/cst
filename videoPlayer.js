// videoPlayer.js

const videoPlayer = (() => {
    let player = null;
    let currentTitle = '';
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const seekAmount = 10; 

    // دالة مساعدة لضمان جلب العناصر بأمان
    const getElement = (id) => document.getElementById(id);
    const seekLeftIndicator = getElement('seek-left-indicator');
    const seekRightIndicator = getElement('seek-right-indicator');
    const videoPlayerScreen = getElement('video-player-screen');
    const overlay = document.querySelector('.video-overlay-controls');

    // =======================================================
    // === وظائف الحماية ضد التقاط الشاشة وتغيير التركيز (Anti-Screencap) ===
    // =======================================================
    let lastTimeHidden = 0;

    function handleVisibilityChange() {
        if (player && videoPlayerScreen) {
            if (document.hidden) {
                // إذا أصبحت الصفحة غير مرئية (مستخدم فتح تطبيق آخر أو أداة تسجيل)
                player.pause();
                
                // إخفاء الفيديو وعرض رسالة تحذير
                videoPlayerScreen.style.backgroundColor = 'black';
                videoPlayerScreen.innerHTML = `
                    <div style="color: white; font-size: 24px; text-align: center; margin-top: 50%;">
                        توقف الفيديو مؤقتاً لأسباب أمنية.
                    </div>
                `;
                lastTimeHidden = Date.now();
                console.warn("Screen lost focus. Video paused for security.");
            } else {
                // إذا عاد المستخدم للصفحة
                const hiddenDuration = Date.now() - lastTimeHidden;
                
                // إعادة بناء عنصر الفيديو الفارغ في الشاشة
                videoPlayerScreen.innerHTML = `
                    <div class="video-player-content">
                         <video id="web-video-player" class="video-js vjs-default-skin" controls preload="auto" data-setup='{}' playsinline></video>
                    </div>
                    <div class="video-overlay-controls">...</div> 
                `;

                // إعادة تهيئة المشغل
                if (player) {
                    const currentUrl = player.currentSrc();
                    player.dispose(); // تفريغ المشغل القديم قبل التهيئة الجديدة
                    initializePlayer(currentUrl, currentTitle);
                    
                    if (hiddenDuration > 1000) {
                        alert('تم استئناف التشغيل. يرجى العلم بأن محاولة التقاط محتوى الفيديو محظورة ومسجلة.');
                    }
                }
            }
        }
    }

    // ربط الحدث
    function setupSecurityListeners() {
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    // إزالة الربط
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
        
        // إعادة إنشاء عنصر الفيديو لضمان عمل Video.js
        const videoContainer = getElement('web-video-player');
        if (!videoContainer) {
            // إذا لم يتم العثور عليه، ربما الشاشة السوداء الأمنية هي الظاهرة
            console.error("خطأ حرج: العنصر #web-video-player مفقود في DOM.");
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
        
        parent.replaceChild(newVideoContainer, videoContainer);
        
        const updatedVideoContainer = newVideoContainer;
        
        // تهيئة المشغل
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
            console.log('Video player is ready and initialized');
            
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
        
        if(overlay) overlay.style.pointerEvents = 'all'; 

        if (overlay) overlay.onclick = function(event) {
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
                    if(seekLeftIndicator) showSeekIndicator(seekLeftIndicator); 
                } else {
                    player.currentTime(player.currentTime() + seekAmount); 
                    if(seekRightIndicator) showSeekIndicator(seekRightIndicator);
                }
                
                lastClickTime = 0; 
            }
        };

        if (player) player.on('dblclick', function(event) {
             event.preventDefault();
             event.stopPropagation();
        });
    }

    function showSeekIndicator(indicator) {
        indicator.classList.add('show');
        setTimeout(() => indicator.classList.remove('show'), 500);
    }

    function openPlayer(url, title) {
        if (!url) {
            alert('رابط الفيديو غير متوفر.');
            return;
        }
        
        if (!videoPlayerScreen) {
             console.error("خطأ: العنصر #video-player-screen مفقود في DOM.");
             return;
        }
        videoPlayerScreen.style.display = 'block';

        if (typeof state !== 'undefined') state.currentScreen = 'video';
        
        // ⚠️ ربط مستمعي الحماية عند فتح المشغل
        setupSecurityListeners(); 

        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('Cannot lock orientation:', e));
        }

        initializePlayer(url, title);
    }

    function exitPlayer() {
        if (typeof state !== 'undefined') state.currentScreen = 'lectures';
        
        // ⚠️ إزالة ربط مستمعي الحماية عند إغلاق المشغل
        removeSecurityListeners(); 
        
        if (player) {
            player.pause();
            player.dispose(); 
            player = null;
        }
        
        if (overlay) overlay.style.pointerEvents = 'none'; 

        if (videoPlayerScreen) {
             videoPlayerScreen.style.display = 'none';
             // إعادة تهيئة المحتوى الداخلي لتجنب ظهور الرسالة الأمنية في المرة القادمة
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
        }

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