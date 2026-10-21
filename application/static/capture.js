/**
 * AgroSense - Plant Disease Detection System
 * JavaScript Application Controller
 * Version: 2.0 - December 2025
 */

'use strict';

// ===================================
// GLOBAL VARIABLES & CONFIGURATION
// ===================================

let selectedFile = null;
let currentMediaType = 'image';
let cameraStream = null;
let capturedImageData = null;
// Language management - Default to English
let currentLanguage = window.currentServerLang || 'en';
let translations = window.serverTranslations || {};

// DOM Elements (initialized lazily)
let elements = {};

// Farmer dashboard data
let analysisHistory = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
let farmerStats = JSON.parse(localStorage.getItem('farmerStats') || '{"total": 0, "healthy": 0, "diseased": 0, "today": 0}');
let currentLocation = null;
let isOfflineMode = localStorage.getItem('offlineMode') === 'true';
let isDarkTheme = localStorage.getItem('darkTheme') === 'true';

// Configuration constants
const CONFIG = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'],
    SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi'],
    CAMERA_CONSTRAINTS: {
        video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: { ideal: 'environment' }
        },
        audio: false
    },
    MESSAGE_TIMEOUT: {
        success: 3000,
        error: 8000,
        warning: 5000
    }
};

// ===================================
// INITIALIZATION FUNCTIONS
// ===================================

function initializeElements() {
    console.log('🔧 Initializing DOM elements...');
    
    const elementIds = [
        'fileInput', 'videoInput', 'uploadArea', 'uploadText', 'uploadBtn',
        'imagePreview', 'videoPreview', 'cameraSection', 'cameraVideo', 
        'captureCanvas', 'analyzeBtn', 'loadingDiv', 'results', 'resultContent',
        'statusIndicator', 'emailSection', 'emailReport', 'emailInputGroup',
        'emailInput', 'emailStatus'
    ];
    
    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
        if (!elements[id]) {
            console.warn(`⚠️ Element not found: ${id}`);
        }
    });
    
    addEventListeners();
    console.log('✅ DOM elements initialized');
    return true;
}

function addEventListeners() {
    console.log('🔗 Adding event listeners...');
    
    // File input events
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (elements.videoInput) {
        elements.videoInput.addEventListener('change', handleVideoSelect);
    }
    
    // Drag and drop events
    if (elements.uploadArea) {
        elements.uploadArea.addEventListener('dragover', handleDragOver);
        elements.uploadArea.addEventListener('dragleave', handleDragLeave);
        elements.uploadArea.addEventListener('drop', handleFileDrop);
        elements.uploadArea.addEventListener('click', handleUploadClick);
    }
    
    // Email events
    if (elements.emailInput) {
        elements.emailInput.addEventListener('input', validateEmail);
        elements.emailInput.addEventListener('blur', validateEmail);
    }
    
    if (elements.emailReport) {
        elements.emailReport.addEventListener('change', toggleEmailInput);
    }
    
    // Media option events
    document.querySelectorAll('.media-option').forEach(option => {
        option.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            if (type) selectMediaType(type);
        });
    });
    
    // Language selector events
    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            if (lang) changeLanguage(lang);
        });
    });
    
    console.log('✅ Event listeners added');
}

async function initializeApplication() {
    console.log('🌱 AgroSense - Plant Disease Detection System Starting...');
    
    try {
        // Initialize DOM elements
        initializeElements();
        
        // Initialize farmer dashboard
        initializeFarmerDashboard();
        
        // Load current language translations
        await loadTranslations(currentLanguage);
        
        // Set initial media type
        selectMediaType('image');
        
        // Check server health
        await checkServerHealth();
        
        // Apply theme
        updateTheme();
        
        // Setup scroll animations
        setupScrollAnimations();
        
        console.log('✅ Application initialized successfully');
        showMessage('System ready for analysis!', 'success');
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showMessage('Application initialization error', 'error');
    }
}

// ===================================
// SERVER COMMUNICATION
// ===================================

async function checkServerHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        console.log('Server health check:', data);
        
        if (data.status === 'healthy') {
            console.log('✅ Server is healthy and ready');
            if (data.email_configured) {
                console.log('📧 Email service configured');
            } else {
                console.warn('📧 Email service not configured');
                showMessage('Warning: Email service not configured', 'warning');
            }
        } else {
            console.warn('⚠️ Server status:', data.status);
            showMessage('Warning: Server is not fully operational.', 'warning');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Health check failed:', error);
        showMessage('Unable to check server status.', 'error');
        throw error;
    }
}

async function loadTranslations(lang) {
    try {
        const response = await fetch(`/get_translations/${lang}`);
        if (response.ok) {
            translations = await response.json();
            currentLanguage = lang;
            updateUILanguage();
            return true;
        }
        throw new Error(`Failed to load translations: ${response.status}`);
    } catch (error) {
        console.error('Error loading translations:', error);
        return false;
    }
}

async function changeLanguage(lang) {
    try {
        const response = await fetch(`/set_language/${lang}`, { method: 'GET' });
        
        if (response.ok) {
            await loadTranslations(lang);
            
            // Update language selector UI
            document.querySelectorAll('.language-option').forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-lang') === lang) {
                    option.classList.add('active');
                }
            });
            
            document.documentElement.lang = lang;
            
            console.log(`Language changed to: ${lang}`);
            const message = lang === 'fr' ? 'Langue changée vers le français' : 'Language changed to English';
            showMessage(message, 'success');
            
        } else {
            throw new Error('Failed to set language on server');
        }
    } catch (error) {
        console.error('Error changing language:', error);
        const message = currentLanguage === 'fr' ? 
            'Erreur lors du changement de langue' : 
            'Error changing language';
        showMessage(message, 'error');
    }
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateUILanguage() {
    if (!translations) return;
    
    // Update translatable elements
    const translatableElements = {
        'hero-title': 'hero_title',
        'hero-description': 'hero_description',
        'media-selection-title': 'media_selection_title',
        'upload-text': 'upload_text',
        'analyze-button': 'analyze_button',
        'results-title': 'result_title',
        'loading-text': 'loading_text'
    };
    
    Object.entries(translatableElements).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element && translations[translationKey]) {
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translations[translationKey];
            } else {
                element.textContent = translations[translationKey];
            }
        }
    });
    
    updateMediaOptions();
    updateStatusIndicator();
}

function updateMediaOptions() {
    const mediaOptions = document.querySelectorAll('.media-option');
    
    mediaOptions.forEach(option => {
        const type = option.getAttribute('data-type');
        const titleElement = option.querySelector('.media-option-title');
        const descElement = option.querySelector('.media-option-desc');
        
        if (titleElement && descElement) {
            switch (type) {
                case 'image':
                    titleElement.textContent = translations.photo_option || 'Photo';
                    descElement.textContent = translations.media_option_image_desc || 'Upload a leaf image from your device';
                    break;
                case 'video':
                    titleElement.textContent = translations.media_option_video_title || 'Video';
                    descElement.textContent = translations.media_option_video_desc || 'Analyze a video to detect diseases';
                    break;
                case 'camera':
                    titleElement.textContent = translations.media_option_camera_title || 'Live Camera';
                    descElement.textContent = translations.media_option_camera_desc || 'Use your camera in real time';
                    break;
            }
        }
    });
}

function updateStatusIndicator() {
    if (!elements.statusIndicator) return;
    
    const statusTexts = {
        'image': translations.status_mode_image || 'Mode: Image',
        'video': translations.status_mode_video || 'Mode: Video',
        'camera': translations.status_mode_camera || 'Mode: Live Camera'
    };
    
    elements.statusIndicator.textContent = statusTexts[currentMediaType];
}

function updateUploadArea(type) {
    if (!elements.uploadArea || !elements.uploadText) return;
    
    const texts = {
        'image': {
            text: translations.upload_text || 'Drag and drop your image here',
            click: translations.upload_click || 'or click to select a file'
        },
        'video': {
            text: 'Drag and drop your video here',
            click: 'or click to select a file'
        },
        'camera': {
            text: 'Real-time camera mode',
            click: 'Use the controls below'
        }
    };
    
    const config = texts[type];
    if (config) {
        elements.uploadText.innerHTML = `${config.text}<br><small>${config.click}</small>`;
    }
    
    // Show/hide sections based on media type
    const sections = {
        'image': [elements.uploadArea, elements.imagePreview],
        'video': [elements.uploadArea, elements.videoPreview],
        'camera': [elements.cameraSection]
    };
    
    // Hide all sections first
    Object.values(sections).flat().forEach(section => {
        if (section) section.style.display = 'none';
    });
    
    // Show relevant sections
    if (sections[type]) {
        sections[type].forEach(section => {
            if (section) section.style.display = 'block';
        });
    }
}

// ===================================
// MEDIA TYPE SELECTION
// ===================================

function selectMediaType(type) {
    currentMediaType = type;
    
    // Update active state
    document.querySelectorAll('.media-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-type') === type) {
            option.classList.add('active');
        }
    });
    
    // Reset UI
    resetUI();
    
    // Update UI for selected type
    updateUploadArea(type);
    updateStatusIndicator();
    
    // Show email section
    if (elements.emailSection) {
        elements.emailSection.classList.add('show');
    }
    
    console.log(`Media type selected: ${type}`);
}

function resetUI() {
    selectedFile = null;
    capturedImageData = null;
    
    if (elements.imagePreview) elements.imagePreview.innerHTML = '';
    if (elements.videoPreview) elements.videoPreview.innerHTML = '';
    if (elements.analyzeBtn) elements.analyzeBtn.style.display = 'none';
    if (elements.results) elements.results.style.display = 'none';
    
    hideMessage();
    
    // Reset email section
    if (elements.emailReport) elements.emailReport.checked = false;
    if (elements.emailInput) elements.emailInput.value = '';
    if (elements.emailInputGroup) elements.emailInputGroup.classList.remove('show');
    if (elements.emailStatus) elements.emailStatus.style.display = 'none';
    
    // Stop camera if running
    if (cameraStream) {
        stopCamera();
    }
}

// ===================================
// FILE HANDLING FUNCTIONS
// ===================================

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && validateFile(file, 'image')) {
        processFile(file);
    }
}

function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (file && validateFile(file, 'video')) {
        processVideo(file);
    }
}

function handleUploadClick() {
    if (currentMediaType === 'image' && elements.fileInput) {
        elements.fileInput.click();
    } else if (currentMediaType === 'video' && elements.videoInput) {
        elements.videoInput.click();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (elements.uploadArea) {
        elements.uploadArea.classList.add('dragover');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (elements.uploadArea) {
        elements.uploadArea.classList.remove('dragover');
    }
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (elements.uploadArea) {
        elements.uploadArea.classList.remove('dragover');
    }
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    console.log(`File dropped: ${file.name}, type: ${file.type}, size: ${file.size}`);
    
    if (currentMediaType === 'image' && file.type.startsWith('image/')) {
        if (validateFile(file, 'image')) {
            processFile(file);
            showMessage('Image successfully dropped!', 'success');
        }
    } else if (currentMediaType === 'video' && file.type.startsWith('video/')) {
        if (validateFile(file, 'video')) {
            processVideo(file);
            showMessage('Video successfully dropped!', 'success');
        }
    } else {
        showMessage(`Incorrect file type for ${currentMediaType} mode`, 'error');
    }
}

function validateFile(file, expectedType) {
    const typeCheck = expectedType === 'image' ? 
        CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type) :
        CONFIG.SUPPORTED_VIDEO_TYPES.includes(file.type);
    
    if (!typeCheck) {
        showMessage(`Unsupported file format: ${file.type}`, 'error');
        return false;
    }
    
    const maxSize = expectedType === 'image' ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        showMessage(`File too large. Maximum size: ${maxSizeMB}MB`, 'error');
        return false;
    }
    
    return true;
}

function processFile(file) {
    selectedFile = file;
    console.log(`Processing image file: ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (elements.imagePreview) {
            elements.imagePreview.innerHTML = createPreviewHTML(e.target.result, file, 'image');
        }
        if (elements.videoPreview) elements.videoPreview.innerHTML = '';
        if (elements.analyzeBtn) elements.analyzeBtn.style.display = 'inline-block';
        hideMessage();
    };
    reader.onerror = function() {
        showMessage('Error reading image file', 'error');
    };
    reader.readAsDataURL(file);
}

function processVideo(file) {
    selectedFile = file;
    console.log(`Processing video file: ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (elements.videoPreview) {
            elements.videoPreview.innerHTML = createVideoPreviewHTML(e.target.result, file);
        }
        if (elements.imagePreview) elements.imagePreview.innerHTML = '';
        if (elements.analyzeBtn) elements.analyzeBtn.style.display = 'inline-block';
        hideMessage();
    };
    reader.onerror = function() {
        showMessage('Error reading video file', 'error');
    };
    reader.readAsDataURL(file);
}

function createPreviewHTML(src, file, type) {
    return `
        <img src="${src}" alt="Preview" class="preview-img" style="max-width: 100%; max-height: 400px; border-radius: 15px;">
        <div class="preview-info">
            <div class="success-indicator">
                <i class="fas fa-check-circle"></i> ${type === 'image' ? 'Image' : 'Frame'} uploaded successfully
            </div>
            <div class="file-details">
                <strong>${file.name}</strong><br>
                <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
            <button onclick="deleteMedia()" class="delete-btn">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
}

function createVideoPreviewHTML(src, file) {
    return `
        <video controls class="preview-video" style="max-width: 100%; max-height: 400px; border-radius: 15px;">
            <source src="${src}" type="${file.type}">
            Your browser does not support video playback.
        </video>
        <div class="preview-info">
            <div class="success-indicator">
                <i class="fas fa-check-circle"></i> Video uploaded successfully
            </div>
            <div class="file-details">
                <strong>${file.name}</strong><br>
                <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
            <button onclick="deleteMedia()" class="delete-btn">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
}

function deleteMedia() {
    selectedFile = null;
    capturedImageData = null;
    
    if (elements.imagePreview) elements.imagePreview.innerHTML = '';
    if (elements.videoPreview) elements.videoPreview.innerHTML = '';
    if (elements.analyzeBtn) elements.analyzeBtn.style.display = 'none';
    if (elements.results) elements.results.style.display = 'none';
    
    // Reset file inputs
    if (elements.fileInput) elements.fileInput.value = '';
    if (elements.videoInput) elements.videoInput.value = '';
    
    showMessage('File deleted successfully!', 'success');
}

// ===================================
// CAMERA FUNCTIONS
// ===================================

async function startCamera() {
    try {
        console.log('Starting camera...');
        showMessage('Starting camera...', 'info');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported by this browser');
        }
        
        // Stop existing stream first
        if (cameraStream) {
            stopCamera();
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(CONFIG.CAMERA_CONSTRAINTS);
        
        if (elements.cameraVideo) {
            elements.cameraVideo.srcObject = cameraStream;
            
            // Wait for video to load
            elements.cameraVideo.onloadedmetadata = () => {
                elements.cameraVideo.play().then(() => {
                    console.log(`Camera initialized: ${elements.cameraVideo.videoWidth}x${elements.cameraVideo.videoHeight}`);
                    updateCameraButtons(true);
                    updateStatusIndicator();
                    hideMessage();
                    showMessage('Camera activated successfully!', 'success');
                }).catch(error => {
                    console.error('Error playing video:', error);
                    handleCameraError(error);
                });
            };
            
            elements.cameraVideo.onerror = (error) => {
                console.error('Video element error:', error);
                handleCameraError(error);
            };
        }
        
    } catch (error) {
        console.error('Camera error:', error);
        handleCameraError(error);
    }
}

function captureFromCamera() {
    if (!cameraStream || !elements.cameraVideo) {
        showMessage('Camera not available. Please start the camera first.', 'error');
        return;
    }
    
    try {
        // Ensure canvas exists
        if (!elements.captureCanvas) {
            const canvas = document.createElement('canvas');
            canvas.id = 'captureCanvas';
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
            elements.captureCanvas = canvas;
        }
        
        const video = elements.cameraVideo;
        const canvas = elements.captureCanvas;
        const context = canvas.getContext('2d');
        
        // Set canvas size to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(blob => {
            if (blob) {
                capturedImageData = blob;
                selectedFile = null; // Clear any previously selected file
                
                const url = URL.createObjectURL(blob);
                if (elements.imagePreview) {
                    elements.imagePreview.innerHTML = createCapturePreviewHTML(url);
                }
                if (elements.videoPreview) elements.videoPreview.innerHTML = '';
                if (elements.analyzeBtn) elements.analyzeBtn.style.display = 'inline-block';
                
                showMessage('Image captured successfully!', 'success');
                
                // Add capture effect
                addCaptureEffect();
                
            } else {
                showMessage('Error capturing image', 'error');
            }
        }, 'image/jpeg', 0.92);
        
    } catch (error) {
        console.error('Capture error:', error);
        showMessage('Capture error: ' + error.message, 'error');
    }
}

function addCaptureEffect() {
    // Add visual feedback for capture
    if (elements.cameraVideo) {
        elements.cameraVideo.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            elements.cameraVideo.style.filter = 'none';
        }, 200);
    }
    
    // Add sound effect if available
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTai2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmzwAA==');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio fails
    } catch (e) {
        // Ignore audio errors
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Track stopped: ${track.kind}`);
        });
        cameraStream = null;
        
        if (elements.cameraVideo) {
            elements.cameraVideo.srcObject = null;
            elements.cameraVideo.style.filter = 'none';
        }
        
        updateCameraButtons(false);
        updateStatusIndicator();
        
        showMessage('Camera stopped', 'success');
    }
}

function updateCameraButtons(isActive) {
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    
    if (startBtn) {
        startBtn.style.display = isActive ? 'none' : 'inline-block';
        startBtn.innerHTML = isActive ? 
            '<i class="fas fa-play"></i> Start Camera' : 
            '<i class="fas fa-play"></i> Start Camera';
    }
    if (captureBtn) {
        captureBtn.style.display = isActive ? 'inline-block' : 'none';
        captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture';
    }
    if (stopBtn) {
        stopBtn.style.display = isActive ? 'inline-block' : 'none';
        stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    }
    
    if (elements.statusIndicator) {
        if (isActive) {
            elements.statusIndicator.textContent = 'Mode: Live Stream - Active';
            elements.statusIndicator.classList.add('recording');
            elements.statusIndicator.style.background = '#e76f51';
            elements.statusIndicator.style.animation = 'pulse 2s infinite';
        } else {
            elements.statusIndicator.textContent = 'Mode: Live Stream';
            elements.statusIndicator.classList.remove('recording');
            elements.statusIndicator.style.background = 'var(--gold)';
            elements.statusIndicator.style.animation = 'none';
        }
    }
}

function handleCameraError(error) {
    let errorMsg = 'Camera access error: ';
    
    switch (error.name) {
        case 'NotAllowedError':
            errorMsg += 'Permission denied. Please allow camera access in your browser settings.';
            break;
        case 'NotFoundError':
            errorMsg += 'No camera found on this device.';
            break;
        case 'NotReadableError':
            errorMsg += 'Camera already in use by another application. Close other applications using the camera.';
            break;
        case 'OverconstrainedError':
            errorMsg += 'Camera configuration not supported. Try a different camera.';
            break;
        case 'SecurityError':
            errorMsg += 'Camera access blocked for security reasons. Use HTTPS.';
            break;
        case 'AbortError':
            errorMsg += 'Operation aborted.';
            break;
        default:
            errorMsg += error.message || 'Unknown error';
    }
    
    showMessage(errorMsg, 'error');
    updateCameraButtons(false);
}

function createCapturePreviewHTML(url) {
    return `
        <div class="capture-container">
            <img src="${url}" alt="Captured frame" class="preview-img" style="max-width: 100%; max-height: 400px; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.2);">
            <div class="preview-info">
                <div class="success-indicator">
                    <i class="fas fa-camera"></i> Image captured from camera
                </div>
                <div class="capture-details">
                    <strong>Capture_${new Date().toLocaleTimeString()}.jpg</strong><br>
                    <small>Resolution: ${elements.captureCanvas ? elements.captureCanvas.width : 640}x${elements.captureCanvas ? elements.captureCanvas.height : 480}</small>
                </div>
                <div class="preview-actions">
                    <button onclick="captureFromCamera()" class="action-btn primary">
                        <i class="fas fa-camera"></i> New Capture
                    </button>
                    <button onclick="deleteMedia()" class="action-btn danger">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===================================
// ANALYSIS FUNCTIONS
// ===================================

function analyzeMedia() {
    let dataToAnalyze = null;
    let analysisType = currentMediaType;
    
    // Determine what to analyze
    if (currentMediaType === 'image' && selectedFile) {
        dataToAnalyze = selectedFile;
    } else if (currentMediaType === 'video' && selectedFile) {
        dataToAnalyze = selectedFile;
        analysisType = 'video';
    } else if (currentMediaType === 'camera' && capturedImageData) {
        dataToAnalyze = capturedImageData;
        analysisType = 'image';
    } else {
        const errorMsg = currentLanguage === 'fr' ? 
            'Veuillez sélectionner un fichier ou capturer une image d\'abord.' :
            'Please select a file or capture an image first.';
        showMessage(errorMsg, 'error');
        return;
    }
    
    // Validate email if enabled
    const sendEmail = elements.emailReport && elements.emailReport.checked;
    const userEmail = elements.emailInput ? elements.emailInput.value.trim() : '';
    
    if (sendEmail && !validateEmail()) {
        const errorMsg = currentLanguage === 'fr' ? 
            'Veuillez corriger l\'adresse email avant de continuer.' :
            'Please correct the email address before continuing.';
        showMessage(errorMsg, 'error');
        return;
    }
    
    // Start analysis
    showLoading(true);
    
    // Prepare and send request
    if (analysisType === 'video') {
        extractVideoFrame(dataToAnalyze)
            .then(imageBlob => {
                const formData = createFormData(imageBlob, sendEmail, userEmail);
                sendAnalysisRequest(formData);
            })
            .catch(error => {
                handleAnalysisError('Error extracting video frame: ' + error.message);
            });
    } else {
        const formData = createFormData(dataToAnalyze, sendEmail, userEmail);
        sendAnalysisRequest(formData);
    }
}

function createFormData(imageData, sendEmail, userEmail) {
    const formData = new FormData();
    formData.append('image', imageData, getFileName());
    formData.append('media_type', currentMediaType);
    formData.append('send_email', sendEmail ? 'true' : 'false');
    
    if (sendEmail && userEmail) {
        formData.append('user_email', userEmail);
    }
    
    return formData;
}

function getFileName() {
    if (selectedFile) {
        return selectedFile.name;
    } else if (currentMediaType === 'camera') {
        return `capture_${Date.now()}.jpg`;
    } else {
        return `analysis_${Date.now()}.jpg`;
    }
}

async function sendAnalysisRequest(formData) {
    try {
        console.log('Sending analysis request:', {
            mediaType: currentMediaType,
            sendEmail: elements.emailReport ? elements.emailReport.checked : false,
            timestamp: new Date().toISOString()
        });
        
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Analysis response:', data);
        
        showLoading(false);
        
        if (response.ok && data.status === 'success') {
            displayResults(data);
            saveAnalysisToHistory(data);
            updateFarmerStats(data);
            showMessage(translations.analysis_success || 'Analysis completed successfully!', 'success');
            
            // Handle email status
            if (elements.emailReport && elements.emailReport.checked) {
                handleEmailStatus(data);
            }
        } else {
            const errorMessage = data.error || `HTTP error ${response.status}`;
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Analysis request failed:', error);
        handleAnalysisError('Error during analysis: ' + error.message);
    }
}

function showLoading(show) {
    if (elements.loadingDiv) elements.loadingDiv.style.display = show ? 'block' : 'none';
    if (elements.results) elements.results.style.display = 'none';
    
    if (elements.analyzeBtn) {
        elements.analyzeBtn.disabled = show;
        elements.analyzeBtn.innerHTML = show ? 
            `<i class="fas fa-spinner fa-spin"></i> ${translations.loading_text || 'Analyzing...'}` :
            `<i class="fas fa-search"></i> ${translations.analyze_button || 'Analyze'}`;
    }
}

function handleEmailStatus(data) {
    if (data.email_sent && data.email_recipient) {
        showEmailStatus(`✅ Report successfully sent to ${data.email_recipient}`, 'success');
    } else {
        showEmailStatus('⚠️ Error sending report via email', 'error');
    }
}

function showEmailStatus(message, type) {
    if (elements.emailStatus) {
        elements.emailStatus.textContent = message;
        elements.emailStatus.className = `email-status ${type}`;
        elements.emailStatus.style.display = 'block';
        
        setTimeout(() => {
            elements.emailStatus.style.display = 'none';
        }, CONFIG.MESSAGE_TIMEOUT[type] || 5000);
    }
}

async function extractVideoFrame(videoFile) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.currentTime = Math.min(1, video.duration * 0.1); // 10% into video or 1 second
        };
        
        video.onseeked = () => {
            try {
                context.drawImage(video, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            } catch (error) {
                reject(error);
            }
        };
        
        video.onerror = reject;
        video.src = URL.createObjectURL(videoFile);
    });
}

function handleAnalysisError(message) {
    showLoading(false);
    showMessage(message, 'error');
}

// ===================================
// RESULTS DISPLAY
// ===================================

function displayResults(data) {
    if (!elements.resultContent) return;
    
    const disease = data.prediction;
    const confidence = data.confidence;
    const timestamp = data.timestamp || 'Non disponible';
    const modelInfo = data.model_info || {};
    const emailSent = data.email_sent || false;
    const emailRecipient = data.email_recipient || null;
    
    // Determine severity
    const isHealthy = disease.toLowerCase().includes('healthy') || disease.toLowerCase().includes('sain');
    const severityClass = isHealthy ? 'success' : 'warning';
    const severityIcon = isHealthy ? 'fa-check-circle' : 'fa-exclamation-triangle';
    const severityText = isHealthy ? 'Healthy Plant' : 'Disease Detected';
    const severityColor = isHealthy ? 'var(--accent-green)' : '#e76f51';
    
    elements.resultContent.innerHTML = createResultsHTML({
        disease, confidence, timestamp, modelInfo, emailSent, emailRecipient,
        severityClass, severityIcon, severityText, severityColor
    });
    
    if (elements.results) {
        elements.results.style.display = 'block';
        elements.results.scrollIntoView({ behavior: 'smooth' });
    }
    
    console.log('Results displayed:', { disease, confidence, timestamp });
}

function createResultsHTML(data) {
    const {
        disease, confidence, timestamp, modelInfo, emailSent, emailRecipient,
        severityClass, severityIcon, severityText, severityColor
    } = data;
    
    return `
        <div class="result-header" style="background: ${severityColor}; color: white; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
            <h4 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${severityIcon}"></i> ${severityText}
            </h4>
        </div>
        <div class="result-details">
            <div class="result-disease">
                <h5><i class="fas fa-leaf"></i> Diagnosis</h5>
                <p>${formatDiseaseName(disease)}</p>
            </div>
            <div class="result-confidence">
                <h5><i class="fas fa-percentage"></i> Confidence Level</h5>
                <div class="confidence-display">
                    <span class="confidence-value">${confidence}</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="background: ${severityColor}; width: ${parseFloat(confidence)}%;"></div>
                    </div>
                </div>
            </div>
            <div class="result-recommendations">
                <h5><i class="fas fa-lightbulb"></i> Recommendations</h5>
                <div class="recommendations-content">
                    ${getRecommendations(disease)}
                </div>
            </div>
            ${emailSent && emailRecipient ? `
            <div class="email-notification success">
                <h5><i class="fas fa-envelope-check"></i> Email Report Sent</h5>
                <p>A detailed report has been sent to <strong>${emailRecipient}</strong></p>
            </div>
            ` : ''}
            <div class="result-meta">
                <div class="meta-grid">
                    <div class="meta-item">
                        <strong><i class="fas fa-clock"></i> Analyzed on:</strong><br>
                        ${new Date(timestamp).toLocaleString('en-US')}
                    </div>
                    <div class="meta-item">
                        <strong><i class="fas fa-microchip"></i> Model:</strong><br>
                        ${modelInfo.model_type || 'MobileNetV2'}
                    </div>
                    <div class="meta-item">
                        <strong><i class="fas fa-camera"></i> Source:</strong><br>
                        ${getMediaSourceName(currentMediaType)}
                    </div>
                    <div class="meta-item">
                        <strong><i class="fas fa-server"></i> Device:</strong><br>
                        ${modelInfo.device || 'CPU'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatDiseaseName(disease) {
    return disease
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())
        .trim();
}

function getMediaSourceName(mediaType) {
    const sources = {
        'image': 'Uploaded Image',
        'video': 'Extracted Video Frame',
        'camera': 'Camera Capture'
    };
    return sources[mediaType] || 'Unknown';
}

function getRecommendations(disease) {
    const diseaseLower = disease.toLowerCase();
    
    const recommendations = {
        'healthy': {
            text: 'Great news! Your plant is healthy.',
            actions: ['Continue your good care practices', 'Maintain regular watering', 'Regularly monitor leaf condition', 'Ensure proper light exposure']
        },
        'rust': {
            text: 'Rust detected - fungal disease requiring intervention.',
            actions: ['Apply a copper-based fungicide', 'Improve air circulation around the plant', 'Avoid watering on leaves', 'Remove and destroy infected leaves', 'Treat preferably in the morning']
        },
        'spot': {
            text: 'Leaf spots identified - preventive treatment recommended.',
            actions: ['Immediately remove spotted leaves', 'Apply a preventive fungicide', 'Reduce ambient humidity', 'Space plants for better aeration', 'Water only at the base of the plant']
        },
        'blight': {
            text: 'Blight detected - urgent intervention required!',
            actions: ['Immediate systemic fungicide treatment', 'Isolate the infected plant from others', 'Improve soil drainage', 'Actively monitor other plants', 'Consult a professional if infection persists']
        },
        'scab': {
            text: 'Scab identified - curative treatment needed.',
            actions: ['Apply an appropriate fungicide', 'Thoroughly clean plant debris', 'Preventive treatment next spring', 'Prune for better aeration if needed', 'Enhanced monitoring during the season']
        }
    };
    
    for (const [key, recommendation] of Object.entries(recommendations)) {
        if (diseaseLower.includes(key)) {
            return `${recommendation.text}<br><br><strong>Recommended Actions:</strong><br>• ${recommendation.actions.join('<br>• ')}`;
        }
    }
    
    return 'Disease identified. Consult a plant pathology expert for a precise diagnosis and personalized treatment plan. In the meantime, isolate the plant and monitor symptom progression.';
}

// ===================================
// EMAIL FUNCTIONS
// ===================================

function toggleEmailInput() {
    if (!elements.emailReport || !elements.emailInputGroup) return;
    
    const isChecked = elements.emailReport.checked;
    elements.emailInputGroup.classList.toggle('show', isChecked);
    
    if (isChecked && elements.emailInput) {
        elements.emailInput.focus();
    } else if (elements.emailInput) {
        elements.emailInput.value = '';
        if (elements.emailStatus) elements.emailStatus.style.display = 'none';
    }
}

function validateEmail() {
    if (!elements.emailInput) return true;
    
    const email = elements.emailInput.value.trim();
    if (!email) return true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    elements.emailInput.classList.toggle('invalid', !isValid);
    
    if (!isValid && email) {
        showEmailStatus('Invalid email format', 'error');
    } else {
        if (elements.emailStatus) elements.emailStatus.style.display = 'none';
    }
    
    return isValid;
}

// ===================================
// FARMER DASHBOARD FUNCTIONS
// ===================================

function initializeFarmerDashboard() {
    updateFarmerStats();
    updateLocationDisplay();
    updateOfflineIndicator();
    updateTheme();
    console.log('Farmer dashboard initialized');
}

function saveAnalysisToHistory(data) {
    const analysis = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        disease: data.prediction,
        confidence: data.confidence,
        mediaType: currentMediaType,
        location: currentLocation
    };
    
    analysisHistory.unshift(analysis);
    
    // Keep only last 100 analyses
    if (analysisHistory.length > 100) {
        analysisHistory = analysisHistory.slice(0, 100);
    }
    
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
}

function updateFarmerStats(data = null) {
    if (data) {
        farmerStats.total += 1;
        
        const isHealthy = data.prediction.toLowerCase().includes('healthy') || 
                         data.prediction.toLowerCase().includes('sain');
        
        if (isHealthy) {
            farmerStats.healthy += 1;
        } else {
            farmerStats.diseased += 1;
        }
        
        // Check if today
        const today = new Date().toDateString();
        const lastUpdate = localStorage.getItem('lastStatsUpdate');
        
        if (lastUpdate !== today) {
            farmerStats.today = 1;
            localStorage.setItem('lastStatsUpdate', today);
        } else {
            farmerStats.today += 1;
        }
        
        localStorage.setItem('farmerStats', JSON.stringify(farmerStats));
    }
    
    // Update UI elements
    const statElements = {
        'total-analyses': farmerStats.total,
        'healthy-plants': farmerStats.healthy,
        'diseased-plants': farmerStats.diseased,
        'today-analyses': farmerStats.today
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function getCurrentLocation() {
    const locationInfo = document.getElementById('locationInfo');
    const coordsElement = document.getElementById('location-coords');
    
    if (locationInfo) locationInfo.classList.add('loading');
    if (coordsElement) coordsElement.textContent = 'Obtaining position...';
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                currentLocation = { lat: latitude, lng: longitude };
                
                if (locationInfo) locationInfo.classList.remove('loading');
                if (coordsElement) {
                    coordsElement.textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
                }
                
                showMessage('Position obtained successfully!', 'success');
                console.log('Location obtained:', currentLocation);
            },
            (error) => {
                if (locationInfo) locationInfo.classList.remove('loading');
                if (coordsElement) coordsElement.textContent = 'Location unavailable';
                
                let errorMsg = 'Geolocation error: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Position unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Timeout';
                        break;
                    default:
                        errorMsg += error.message;
                }
                showMessage(errorMsg, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    } else {
        showMessage('Geolocation not supported by this browser', 'error');
    }
}

function updateLocationDisplay() {
    const coordsElement = document.getElementById('location-coords');
    if (currentLocation && coordsElement) {
        coordsElement.textContent = `${currentLocation.lat.toFixed(4)}°, ${currentLocation.lng.toFixed(4)}°`;
    }
}

function toggleOfflineMode() {
    isOfflineMode = !isOfflineMode;
    localStorage.setItem('offlineMode', isOfflineMode.toString());
    updateOfflineIndicator();
    
    const icon = document.getElementById('offline-icon');
    if (icon) {
        icon.className = isOfflineMode ? 'fas fa-wifi-slash' : 'fas fa-wifi';
    }
    
    showMessage(isOfflineMode ? 'Offline mode activated' : 'Online mode activated', 'success');
}

function updateOfflineIndicator() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
        indicator.classList.toggle('show', isOfflineMode);
        if (isOfflineMode) {
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline mode activated';
        }
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('darkTheme', isDarkTheme.toString());
    updateTheme();
}

function updateTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    body.classList.toggle('dark-theme', isDarkTheme);
    
    if (icon) {
        icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleHistory() {
    const historySection = document.getElementById('analysisHistory');
    if (historySection) {
        const isVisible = historySection.style.display !== 'none';
        historySection.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            updateHistoryDisplay();
            historySection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    if (analysisHistory.length === 0) {
        historyContainer.innerHTML = '<p>No recorded analyses</p>';
        return;
    }
    
    const historyHTML = analysisHistory.slice(0, 10).map(analysis => {
        const date = new Date(analysis.timestamp).toLocaleString('en-US');
        const isHealthy = analysis.disease.toLowerCase().includes('healthy');
        const statusIcon = isHealthy ? 'fa-check-circle' : 'fa-exclamation-triangle';
        const statusColor = isHealthy ? '#4a7c59' : '#e76f51';
        
        return `
            <div class="history-item" style="border-left: 4px solid ${statusColor};">
                <div class="history-header">
                    <i class="fas ${statusIcon}" style="color: ${statusColor};"></i>
                    <span class="history-disease">${formatDiseaseName(analysis.disease)}</span>
                    <span class="history-confidence">${analysis.confidence}</span>
                </div>
                <div class="history-meta">
                    <small>${date} • ${analysis.mediaType}</small>
                </div>
            </div>
        `;
    }).join('');
    
    historyContainer.innerHTML = historyHTML;
}

function exportData() {
    const data = {
        statistics: farmerStats,
        history: analysisHistory,
        settings: {
            language: currentLanguage,
            darkTheme: isDarkTheme,
            offlineMode: isOfflineMode
        },
        exportDate: new Date().toISOString(),
        version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrosense-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully!', 'success');
}

function clearAllData() {
    const message = currentLanguage === 'fr' ? 
        'Êtes-vous sûr de vouloir effacer toutes les données ? Cette action est irréversible.' :
        'Are you sure you want to clear all data? This action is irreversible.';
        
    if (confirm(message)) {
        localStorage.clear();
        analysisHistory = [];
        farmerStats = {"total": 0, "healthy": 0, "diseased": 0, "today": 0};
        currentLocation = null;
        
        updateFarmerStats();
        showMessage('All data has been cleared', 'success');
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function showMessage(message, type = 'info') {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const icon = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    messageDiv.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    // Insert message
    const uploadSection = document.querySelector('.upload-section') || document.body;
    uploadSection.insertAdjacentElement('afterend', messageDiv);
    
    // Auto-hide
    setTimeout(() => {
        messageDiv.remove();
    }, CONFIG.MESSAGE_TIMEOUT[type] || 5000);
}

function hideMessage() {
    document.querySelectorAll('.message').forEach(msg => msg.remove());
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// ===================================
// EVENT LISTENERS & INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', initializeApplication);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (cameraStream) {
        stopCamera();
    }
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showMessage('An unexpected error occurred', 'error');
});

// Network status monitoring
window.addEventListener('online', () => {
    if (!isOfflineMode) {
        showMessage('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    showMessage('Connection lost - Automatic offline mode', 'warning');
});

// Export functions to global scope for HTML onclick handlers
window.selectMediaType = selectMediaType;
window.analyzeMedia = analyzeMedia;
window.deleteMedia = deleteMedia;
window.startCamera = startCamera;
window.captureFromCamera = captureFromCamera;
window.stopCamera = stopCamera;
window.changeLanguage = changeLanguage;
window.getCurrentLocation = getCurrentLocation;
window.toggleOfflineMode = toggleOfflineMode;
window.toggleTheme = toggleTheme;
window.toggleHistory = toggleHistory;
window.exportData = exportData;
window.clearAllData = clearAllData;
window.handleUploadClick = handleUploadClick;
window.toggleEmailInput = toggleEmailInput;

console.log('✅ AgroSense JavaScript Application Loaded Successfully');
