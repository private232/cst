// videoPlayer.js

const videoPlayer = (() => {
    let player = null;
    let currentTitle = '';
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const seekAmount = 10; // عدد الثواني للتقديم والتأخير

    // جلب العناصر من الـ DOM
    const seekLeftIndicator = document.getElementById('seek-left-indicator');
    const seekRightIndicator = document.getElementById('seek-right-indicator');
    const videoPlayerScreen = document.getElementById('video-player-screen');
    const overlay = document.querySelector('.video-overlay-controls');

    function initializePlayer(url, title) {
        if (player) {
            player.dispose(); // تفريغ المشغل القديم
            player = null; 
        }
        
        // إعادة إنشاء عنصر الفيديو لضمان عمل Video.js بشكل صحيح
        const videoContainer = document.getElementById('web-video-player');
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
        
        player = videojs(updatedVideoContainer, {
            autoplay: true,
            controls: true,
            fluid: true,
            playbackRates: speeds, 
            sources: [{ src: url, type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' }], 
        }, function() {
            console.log('Video player is ready');
            
            // تفعيل إضافة التحكم بالجودة
            if (this.qualitySelector) {
                this.qualitySelector({ defaultQuality: 'auto' });
            }

            // إضافة وظيفة النقر المزدوج
            addDoubleTapListener();
        });

        // تسجيل وصول الطالب (دالة موجودة في index.html)
        if (typeof logLectureAccess === 'function') {
            logLectureAccess(title); 
        }
        currentTitle = title;
    }
    
    function addDoubleTapListener() {
        let lastClickTime = 0;
        
        // تفعيل pointer-events على overlay للسماح بالتقاط النقرات
        overlay.style.pointerEvents = 'all'; 

        overlay.onclick = function(event) {
            if (player) player.userActive(true); // إظهار عناصر التحكم عند النقر

            const now = Date.now();
            const delta = now - lastClickTime;
            lastClickTime = now;
            
            if (delta > 50 && delta < 350) {
                event.stopPropagation(); 
                
                const clickX = event.clientX;
                const videoRect = player.el().getBoundingClientRect();
                const relativeX = clickX - videoRect.left;
                const videoWidth = videoRect.width;

                // منطق النقر المزدوج (RTL)
                if (relativeX > videoWidth / 2) {
                    // الجانب الأيمن (تأخير 10 ثواني)
                    player.currentTime(player.currentTime() - seekAmount);
                    showSeekIndicator(seekLeftIndicator); 
                } else {
                    // الجانب الأيسر (تقديم 10 ثواني)
                    player.currentTime(player.currentTime() + seekAmount);
                    showSeekIndicator(seekRightIndicator);
                }
                
                lastClickTime = 0; 
            }
        };

        // منع السلوك الافتراضي لـ Video.js عند النقر المزدوج
        player.on('dblclick', function(event) {
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
        
        // تحديث حالة الشاشة
        if (typeof state !== 'undefined') state.currentScreen = 'video';
        
        videoPlayerScreen.style.display = 'block';
        
        // محاولة قفل اتجاه الشاشة (في الهواتف)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log('Cannot lock orientation:', e));
        }

        initializePlayer(url, title);
    }

    function exitPlayer() {
        // تحديث حالة الشاشة
        if (typeof state !== 'undefined') state.currentScreen = 'lectures';
        
        if (player) {
            player.pause();
            player.dispose(); 
            player = null;
        }
        
        overlay.style.pointerEvents = 'none'; // تعطيل النقرات على الـ overlay

        videoPlayerScreen.style.display = 'none';

        // إلغاء قفل اتجاه الشاشة
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        
        // العودة إلى قائمة المحاضرات (دالة موجودة في index.html)
        if (typeof goBackToLectures === 'function') {
            goBackToLectures(); 
        }
    }

    return {
        openPlayer,
        exitPlayer,
    };
})();