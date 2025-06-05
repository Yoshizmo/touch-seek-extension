// Touch Video Seek Extension
// Adds touch-friendly seek buttons overlay to videos

(function() {
    'use strict';
    
    // Configuration
    const SEEK_TIME = 5; // seconds to seek forward/backward
    const OVERLAY_HIDE_TIMEOUT = 3000; // ms to hide overlay after inactivity
    const OVERLAY_SHOW_ON_HOVER = true; // show overlay when hovering over video
    const DEBUG = true; // Enable console logging for debugging
    
    // Track all video elements on the page
    let videoElements = [];
    let overlayTimeouts = new Map();
    // Track overlays per video to prevent duplicates
    const videoOverlayMap = new WeakMap();
    
    // Initialize when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Also run initialize immediately in case DOM is already loaded
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initialize();
    }
    
    // Add a delayed initialization for YouTube and other dynamic sites
    // that might load videos after the page is fully loaded
    window.addEventListener('load', () => {
        if (DEBUG) console.log('Touch Seek: Window load event fired');
        setTimeout(initialize, 1500);
        setTimeout(initialize, 3000);
    });
    
    function initialize() {
        if (DEBUG) console.log('Touch Seek: Initializing extension');
        
        // Find all existing videos
        findAndSetupVideos();
        
        // Watch for new videos being added to the page
        observeDOMForNewVideos();
        
        // For YouTube specifically, we need to check periodically
        // as their player can be loaded dynamically
        if (window.location.hostname.includes('youtube.com')) {
            if (DEBUG) console.log('Touch Seek: YouTube detected, setting up periodic checks');
            setInterval(findAndSetupVideos, 2000);
        }

        // Periodically check for live/non-live transitions and update overlays
        setInterval(checkLiveStatusAndUpdateOverlays, 1500);

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', checkLiveStatusAndUpdateOverlays);
        document.addEventListener('webkitfullscreenchange', checkLiveStatusAndUpdateOverlays);
        document.addEventListener('mozfullscreenchange', checkLiveStatusAndUpdateOverlays);
        document.addEventListener('MSFullscreenChange', checkLiveStatusAndUpdateOverlays);
    }

    // Add or remove overlays based on whether the video is live or not and fullscreen status
    function checkLiveStatusAndUpdateOverlays() {
        const videos = document.querySelectorAll('video');
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                           document.mozFullScreenElement || document.msFullscreenElement;
        
        videos.forEach(video => {
            const overlay = videoOverlayMap.get(video);
            const wasOverlayPresent = !!overlay && document.body.contains(overlay);
            const isLive = isVideoCurrentlyLive(video);
            // Check standard fullscreen and YouTube's theater mode
            const youtubePlayer = document.querySelector('.html5-video-player');
            const isYouTubeFullscreen = youtubePlayer && youtubePlayer.classList.contains('ytp-fullscreen');
            const videoIsFullscreen = isFullscreen || isYouTubeFullscreen;
            
            if (!isLive && videoIsFullscreen && !wasOverlayPresent) {
                // Not live, in fullscreen, no overlay: add overlay
                setupVideoOverlay(video);
            } else if ((isLive || !videoIsFullscreen) && wasOverlayPresent) {
                // Either live or not fullscreen, but overlay present: remove overlay
                overlay.remove();
                videoOverlayMap.delete(video);
                if (DEBUG) console.log('Touch Seek: Removed overlay because video is ' + 
                                      (isLive ? 'live' : 'not in fullscreen'));
            }
        });
    }

    // Helper to check if a video element is currently live
    function isVideoCurrentlyLive(video) {
        // YouTube
        if (window.location.hostname.includes('youtube.com')) {
            const ytPlayer = document.querySelector('.html5-video-player');
            if (ytPlayer && ytPlayer.classList.contains('ytp-live')) return true;
            if (window.location.pathname.includes('/live/')) return true;
        }
        // Twitch
        if (window.location.hostname.includes('twitch.tv')) {
            if (!window.location.pathname.match(/\/videos?\//)) return true;
        }
        return false;
    }
    
    function findAndSetupVideos() {
        const videos = document.querySelectorAll('video');
        if (DEBUG) console.log(`Touch Seek: Found ${videos.length} video elements on page`);
        
        videos.forEach(video => {
            if (!videoElements.includes(video)) {
                if (DEBUG) {
                    console.log('Touch Seek: New video found', {
                        width: video.offsetWidth,
                        height: video.offsetHeight,
                        src: video.currentSrc || 'No src attribute',
                        parent: video.parentNode.tagName
                    });
                }
                
                // Only setup videos that are visible and have dimensions
                if (video.offsetWidth > 0 && video.offsetHeight > 0) {
                    setupVideoOverlay(video);
                    videoElements.push(video);
                } else {
                    // For videos without dimensions yet, check again later
                    setTimeout(() => {
                        if (video.offsetWidth > 0 && video.offsetHeight > 0 && !videoElements.includes(video)) {
                            setupVideoOverlay(video);
                            videoElements.push(video);
                        }
                    }, 1000);
                }
            }
        });
    }
    
    function observeDOMForNewVideos() {
        const observer = new MutationObserver(mutations => {
            let shouldCheck = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck) {
                findAndSetupVideos();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    function setupVideoOverlay(video) {
        if (DEBUG) console.log('Touch Seek: Setting up overlay for video');

        // Prevent duplicate overlays using WeakMap
        if (videoOverlayMap.has(video)) {
            if (DEBUG) console.log('Touch Seek: Video already has overlay (WeakMap), skipping');
            return;
        }
        
        // --- LIVE VIDEO DETECTION ---
        let isLive = false;

        // YouTube-specific live detection
        if (window.location.hostname.includes('youtube.com')) {
            // Look for .ytp-live class on player
            const ytPlayer = document.querySelector('.html5-video-player');
            if (ytPlayer && ytPlayer.classList.contains('ytp-live')) {
                isLive = true;
            }
            // Check URL for /live/
            if (window.location.pathname.includes('/live/')) {
                isLive = true;
            }
        }

        // Twitch-specific live detection (URL only)
        if (window.location.hostname.includes('twitch.tv')) {
            // If URL does not contain /videos/ or /video/, it's likely live
            if (!window.location.pathname.match(/\/videos?\//)) {
                isLive = true;
            }
        }

        if (isLive) {
            if (DEBUG) console.log('Touch Seek: Video is live, not adding overlay controls.');
            return;
        }

        // Check if this video already has an overlay
        const existingOverlay = video.parentNode.querySelector('.touch-seek-overlay-container');
        if (existingOverlay) {
            if (DEBUG) console.log('Touch Seek: Video already has overlay, skipping');
            return;
        }
        
        // Create container for the overlay
        const overlayContainer = document.createElement('div');
        overlayContainer.className = 'touch-seek-overlay-container';
        overlayContainer.id = 'touch-seek-overlay-' + Math.random().toString(36).substr(2, 9);
        // Track this overlay for this video
        videoOverlayMap.set(video, overlayContainer);
        
        // Create the overlay
        const overlay = document.createElement('div');
        overlay.className = 'touch-seek-overlay';
        
        // Check if video has controls or is on a site with known control bars
        const hasControls = video.controls || 
                          window.location.hostname.includes('youtube.com') || 
                          window.location.hostname.includes('twitch.tv') || 
                          window.location.hostname.includes('vimeo.com');
        
        if (hasControls) {
            overlayContainer.classList.add('video-with-controls');
        }
        
        // Create backward button
        const backButton = document.createElement('button');
        backButton.className = 'touch-seek-button touch-seek-back';
        backButton.innerHTML = '<span class="icon-container"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></span><span class="text">-5s</span>';
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (DEBUG) console.log('Touch Seek: Back button clicked, seeking -5s');
            video.currentTime = Math.max(0, video.currentTime - SEEK_TIME);
            showOverlay(overlayContainer);
        });
        
        // Create forward button
        const forwardButton = document.createElement('button');
        forwardButton.className = 'touch-seek-button touch-seek-forward';
        forwardButton.innerHTML = '<span class="text">+5s</span><span class="icon-container"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>';
        forwardButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (DEBUG) console.log('Touch Seek: Forward button clicked, seeking +5s');
            video.currentTime = Math.min(video.duration, video.currentTime + SEEK_TIME);
            showOverlay(overlayContainer);
        });
        
        // Add buttons to overlay
        overlay.appendChild(backButton);
        overlay.appendChild(forwardButton);
        overlayContainer.appendChild(overlay);
        
        // Find the best container for the overlay
        // For YouTube, we want to add it to the video container, not directly after the video
        let container = video.parentNode;
        
        // For YouTube, try to find the player container
        if (window.location.hostname.includes('youtube.com')) {
            // Try to find YouTube's player container
            const ytPlayerContainer = document.querySelector('.html5-video-player') || 
                                     document.querySelector('.ytp-player-content') || 
                                     document.querySelector('#movie_player');
            
            if (ytPlayerContainer) {
                container = ytPlayerContainer;
                if (DEBUG) console.log('Touch Seek: Using YouTube player container');
            }
        }
        
        // Insert overlay into the container
        container.appendChild(overlayContainer);
        if (DEBUG) console.log('Touch Seek: Overlay added to DOM');
        
        // Position the overlay over the video
        positionOverlay(video, overlayContainer);
        
        // Add event listeners to show/hide overlay
        video.addEventListener('play', () => showOverlay(overlayContainer));
        video.addEventListener('pause', () => showOverlay(overlayContainer));
        video.addEventListener('seeking', () => showOverlay(overlayContainer));
        
        if (OVERLAY_SHOW_ON_HOVER) {
            video.addEventListener('mousemove', () => showOverlay(overlayContainer));
            overlayContainer.addEventListener('mousemove', () => showOverlay(overlayContainer));
        }
        
        // Create a more robust resize handler that debounces the calls
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (DEBUG) console.log('Touch Seek: Window resize detected');
                positionOverlay(video, overlayContainer);
            }, 100);
        };
        
        // Handle video resize (e.g., fullscreen)
        window.addEventListener('resize', handleResize);
        
        // Handle scroll events which can affect positioning
        window.addEventListener('scroll', handleResize);
        
        // Handle fullscreen changes
        video.addEventListener('fullscreenchange', handleResize);
        document.addEventListener('fullscreenchange', handleResize);
        document.addEventListener('webkitfullscreenchange', handleResize);
        document.addEventListener('mozfullscreenchange', handleResize);
        
        // For YouTube, we need additional event listeners
        if (window.location.hostname.includes('youtube.com')) {
            // Listen for YouTube's own fullscreen event
            document.addEventListener('yt-page-resize', handleResize);
            
            // Check for theater mode changes
            const observer = new MutationObserver(handleResize);
            
            const ytPlayerApi = document.querySelector('.html5-video-player');
            if (ytPlayerApi) {
                observer.observe(ytPlayerApi, { attributes: true, attributeFilter: ['class'] });
            }
            
            // YouTube has its own resize events
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('yt-player-updated', handleResize);
                window.addEventListener('yt-navigate-finish', handleResize);
            }
        }
        
        // Also periodically check position to ensure it stays correct
        const positionInterval = setInterval(() => {
            if (document.contains(video) && document.contains(overlayContainer)) {
                positionOverlay(video, overlayContainer);
            } else {
                clearInterval(positionInterval);
            }
        }, 2000);
        
        // Initial show
        showOverlay(overlayContainer);
        if (DEBUG) console.log('Touch Seek: Overlay setup complete');
    }
    
    function positionOverlay(video, overlayContainer) {
        if (!video || !overlayContainer) return;
        
        try {
            // Check if video is visible and has dimensions
            if (video.offsetWidth === 0 || video.offsetHeight === 0) {
                if (DEBUG) console.log('Touch Seek: Video has no dimensions, skipping positioning');
                return;
            }
            
            const videoRect = video.getBoundingClientRect();
            if (DEBUG) console.log('Touch Seek: Positioning overlay', videoRect);
            
            // Detect fullscreen mode across browsers
            let isFullscreen = false;
            if (document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement) {
                isFullscreen = true;
            }
            
            // YouTube-specific fullscreen detection
            if (window.location.hostname.includes('youtube.com')) {
                const ytPlayer = document.querySelector('.html5-video-player');
                if (ytPlayer && ytPlayer.classList.contains('ytp-fullscreen')) {
                    isFullscreen = true;
                }
            }
            
            // Set overlay container position and size to match video
            if (isFullscreen) {
                // In fullscreen, position relative to viewport
                overlayContainer.style.position = 'fixed';
                overlayContainer.style.top = '0';
                overlayContainer.style.left = '0';
                overlayContainer.style.width = '100%';
                overlayContainer.style.height = '100%';
            } else {
                // For normal positioning, we need to account for scrolling and iframe offsets
                let top = videoRect.top;
                let left = videoRect.left;
                
                // Add scroll position
                top += window.scrollY || document.documentElement.scrollTop || 0;
                left += window.scrollX || document.documentElement.scrollLeft || 0;
                
                // Set the position and dimensions
                overlayContainer.style.position = 'absolute';
                overlayContainer.style.top = `${top}px`;
                overlayContainer.style.left = `${left}px`;
                overlayContainer.style.width = `${videoRect.width}px`;
                overlayContainer.style.height = `${videoRect.height}px`;
            }
            
            // Ensure overlay is on top of everything
            overlayContainer.style.zIndex = '2147483647'; // Maximum z-index value
            overlayContainer.style.pointerEvents = 'none'; // Let clicks pass through to video
            
            // Make buttons clickable
            const buttons = overlayContainer.querySelectorAll('.touch-seek-button');
            buttons.forEach(button => {
                button.style.pointerEvents = 'auto';
            });
            
            if (DEBUG) console.log('Touch Seek: Overlay positioned successfully');
        } catch (error) {
            console.error('Touch Seek: Error positioning overlay', error);
        }
    }
    
    function showOverlay(overlayContainer) {
        // Make overlay visible
        overlayContainer.style.opacity = '1';
        
        // Clear any existing timeout
        const timeoutId = overlayTimeouts.get(overlayContainer);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Set timeout to hide overlay after inactivity
        const newTimeoutId = setTimeout(() => {
            overlayContainer.style.opacity = '0';
        }, OVERLAY_HIDE_TIMEOUT);
        
        overlayTimeouts.set(overlayContainer, newTimeoutId);
    }
})();
