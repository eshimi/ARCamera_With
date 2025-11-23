import { removeBackground } from '@imgly/background-removal';

// State
const state = {
    motifUrl: null,
    stream: null,
    overlay: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0, // Reserved for future
        opacity: 1,
        bgOpacity: 0,
        isDragging: false,
        lastTouchX: 0,
        lastTouchY: 0,
        initialPinchDistance: 0,
        initialScale: 1,
    },
    controlsVisible: false
};

// Elements
const screens = {
    landing: document.getElementById('landing'),
    loading: document.getElementById('loading'),
    camera: document.getElementById('camera-view'),
    result: document.getElementById('result-view'),
};

const fileInput = document.getElementById('file-input');
const progressFill = document.getElementById('progress-fill');
const loadingText = document.getElementById('loading-text');
const cameraFeed = document.getElementById('camera-feed');

const motifWrapper = document.getElementById('motif-wrapper');
const motifOverlay = document.getElementById('motif-overlay');

const shutterBtn = document.getElementById('shutter-btn');
const capturedImage = document.getElementById('captured-image');
const retakeBtn = document.getElementById('retake-btn');
const downloadBtn = document.getElementById('download-btn');

// Controls
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const controlPanel = document.getElementById('control-panel');
const scaleSlider = document.getElementById('scale-slider');
const opacitySlider = document.getElementById('opacity-slider');
const bgOpacitySlider = document.getElementById('bg-opacity-slider');

// Navigation
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 1. Upload & Process
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showScreen('loading');
    loadingText.innerText = '準備中...';
    progressFill.style.width = '0%';

    if (!crossOriginIsolated) {
        console.warn("SharedArrayBuffer is not available.");
        loadingText.innerText = '注意: 高速化機能が無効です';
    }

    try {
        const config = {
            debug: true,
            progress: (key, current, total) => {
                if (total > 0) {
                    const percent = Math.round((current / total) * 100);
                    progressFill.style.width = `${percent}%`;
                    if (key === 'fetch') loadingText.innerText = `データをダウンロード中... ${percent}%`;
                    else if (key === 'compute') loadingText.innerText = `AIが処理中... ${percent}%`;
                }
            }
        };

        const blob = await removeBackground(file, config);
        state.motifUrl = URL.createObjectURL(blob);
        motifOverlay.src = state.motifUrl;

        loadingText.innerText = 'カメラを起動中...';
        await startCamera();
        showScreen('camera');

        // Reset state
        state.overlay = { ...state.overlay, x: 0, y: 0, scale: 1, opacity: 1, bgOpacity: 0 };
        updateOverlayStyle();

        // Reset sliders
        scaleSlider.value = 1;
        opacitySlider.value = 1;
        bgOpacitySlider.value = 0;

    } catch (error) {
        console.error("Error:", error);
        alert(`処理に失敗しました: ${error.message}`);
        showScreen('landing');
    }
});

// 2. Camera
async function startCamera() {
    if (state.stream) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
        state.stream = stream;
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error("Camera error:", err);
        alert("カメラの起動に失敗しました。");
    }
}

// 3. Controls Logic
function updateOverlayStyle() {
    // Transform applies to wrapper
    motifWrapper.style.transform = `translate(-50%, -50%) translate(${state.overlay.x}px, ${state.overlay.y}px) scale(${state.overlay.scale})`;

    // Opacity applies to image
    motifOverlay.style.opacity = state.overlay.opacity;

    // Background opacity applies to wrapper
    motifWrapper.style.backgroundColor = `rgba(255, 255, 255, ${state.overlay.bgOpacity})`;
}

toggleControlsBtn.addEventListener('click', () => {
    state.controlsVisible = !state.controlsVisible;
    if (state.controlsVisible) {
        controlPanel.classList.remove('hidden');
    } else {
        controlPanel.classList.add('hidden');
    }
});

scaleSlider.addEventListener('input', (e) => {
    state.overlay.scale = parseFloat(e.target.value);
    updateOverlayStyle();
});

opacitySlider.addEventListener('input', (e) => {
    state.overlay.opacity = parseFloat(e.target.value);
    updateOverlayStyle();
});

bgOpacitySlider.addEventListener('input', (e) => {
    state.overlay.bgOpacity = parseFloat(e.target.value);
    updateOverlayStyle();
});

// 4. Interaction (Touch on Wrapper)
motifWrapper.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        state.overlay.isDragging = true;
        state.overlay.lastTouchX = e.touches[0].clientX;
        state.overlay.lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        state.overlay.isDragging = false;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        state.overlay.initialPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        state.overlay.initialScale = state.overlay.scale;
    }
});

motifWrapper.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (state.overlay.isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - state.overlay.lastTouchX;
        const dy = touch.clientY - state.overlay.lastTouchY;

        state.overlay.x += dx;
        state.overlay.y += dy;

        state.overlay.lastTouchX = touch.clientX;
        state.overlay.lastTouchY = touch.clientY;
        updateOverlayStyle();
    } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

        if (state.overlay.initialPinchDistance > 0) {
            const scaleDiff = currentDistance / state.overlay.initialPinchDistance;
            const newScale = state.overlay.initialScale * scaleDiff;
            state.overlay.scale = newScale;
            scaleSlider.value = newScale; // Sync slider
            updateOverlayStyle();
        }
    }
});

motifWrapper.addEventListener('touchend', () => {
    state.overlay.isDragging = false;
});

// Mouse support
motifWrapper.addEventListener('mousedown', (e) => {
    state.overlay.isDragging = true;
    state.overlay.lastTouchX = e.clientX;
    state.overlay.lastTouchY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
    if (state.overlay.isDragging) {
        const dx = e.clientX - state.overlay.lastTouchX;
        const dy = e.clientY - state.overlay.lastTouchY;
        state.overlay.x += dx;
        state.overlay.y += dy;
        state.overlay.lastTouchX = e.clientX;
        state.overlay.lastTouchY = e.clientY;
        updateOverlayStyle();
    }
});

window.addEventListener('mouseup', () => {
    state.overlay.isDragging = false;
});

// 5. Capture
shutterBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = cameraFeed.clientWidth;
    const height = cameraFeed.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Draw Video
    const vWidth = cameraFeed.videoWidth;
    const vHeight = cameraFeed.videoHeight;
    const vRatio = vWidth / vHeight;
    const cRatio = width / height;

    let sWidth, sHeight, sx, sy;
    if (cRatio > vRatio) {
        sWidth = vWidth;
        sHeight = vWidth / cRatio;
        sx = 0;
        sy = (vHeight - sHeight) / 2;
    } else {
        sHeight = vHeight;
        sWidth = vHeight * cRatio;
        sy = 0;
        sx = (vWidth - sWidth) / 2;
    }
    ctx.drawImage(cameraFeed, sx, sy, sWidth, sHeight, 0, 0, width, height);

    // Draw Motif
    ctx.save();

    // Translate to wrapper position
    ctx.translate(width / 2 + state.overlay.x, height / 2 + state.overlay.y);
    ctx.scale(state.overlay.scale, state.overlay.scale);

    // Calculate dimensions
    // The wrapper has padding: 10px.
    // The image has max-width: 80vw.
    // We need to approximate the rendered size.
    // Let's use the natural size of the image as base, but scaled down if it was constrained by CSS.
    // Actually, simpler: use the rendered size of the image element.

    const imgRect = motifOverlay.getBoundingClientRect();
    const wrapperRect = motifWrapper.getBoundingClientRect();

    // We need unscaled dimensions for the canvas context which is already scaled.
    // Rendered Width / Scale = Base Width
    const baseImgW = imgRect.width / state.overlay.scale;
    const baseImgH = imgRect.height / state.overlay.scale;
    const baseWrapperW = wrapperRect.width / state.overlay.scale;
    const baseWrapperH = wrapperRect.height / state.overlay.scale;

    // Draw Background
    if (state.overlay.bgOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.overlay.bgOpacity})`;
        // Draw rounded rect (simplified as rect for now)
        // Centered
        ctx.beginPath();
        ctx.roundRect(-baseWrapperW / 2, -baseWrapperH / 2, baseWrapperW, baseWrapperH, 10);
        ctx.fill();
    }

    // Draw Image
    ctx.globalAlpha = state.overlay.opacity;
    ctx.drawImage(motifOverlay, -baseImgW / 2, -baseImgH / 2, baseImgW, baseImgH);

    ctx.restore();

    capturedImage.src = canvas.toDataURL('image/png');
    showScreen('result');
});

// Long press to capture
let longPressTimer = null;
const cameraView = document.getElementById('camera-view');

function capturePhoto() {
    // Trigger the same capture logic as shutter button
    shutterBtn.click();
}

cameraView.addEventListener('touchstart', (e) => {
    // Only trigger if not touching the motif or controls
    if (e.target === cameraFeed || e.target === cameraView) {
        longPressTimer = setTimeout(() => {
            // Visual feedback
            cameraView.style.animation = 'flash 0.3s';
            setTimeout(() => {
                cameraView.style.animation = '';
            }, 300);

            capturePhoto();
        }, 800); // 800ms long press
    }
});

cameraView.addEventListener('touchend', () => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
});

cameraView.addEventListener('touchmove', () => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
});


// Result Actions
retakeBtn.addEventListener('click', () => {
    showScreen('camera');
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `ar-motif-${Date.now()}.png`;
    link.href = capturedImage.src;
    link.click();

    // Navigate to landing page after a short delay
    setTimeout(() => {
        showScreen('landing');
        fileInput.value = ''; // Reset file input
    }, 1000);
});
