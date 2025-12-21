// DOM Elements
const selectSourceBtn = document.getElementById('selectSource');
const startCaptureBtn = document.getElementById('startCapture');
const stopCaptureBtn = document.getElementById('stopCapture');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator').querySelector('.dot');
const capturedTextEl = document.getElementById('capturedText');
const suggestionsEl = document.getElementById('suggestions');
const sourceModal = document.getElementById('sourceModal');
const closeModalBtn = document.getElementById('closeModal');
const sourceList = document.getElementById('sourceList');
const autoRefreshCheckbox = document.getElementById('autoRefresh');

// State
let selectedSource = null;
let mediaStream = null;
let captureInterval = null;
let videoElement = null;
let canvasElement = null;

// Initialize
function init() {
  selectSourceBtn.addEventListener('click', showSourceSelection);
  startCaptureBtn.addEventListener('click', startCapture);
  stopCaptureBtn.addEventListener('click', stopCapture);
  closeModalBtn.addEventListener('click', () => {
    sourceModal.classList.remove('active');
  });
}

// Show source selection modal
async function showSourceSelection() {
  try {
    const sources = await window.electronAPI.getSources();
    sourceList.innerHTML = '';
    
    sources.forEach(source => {
      const sourceItem = document.createElement('div');
      sourceItem.className = 'source-item';
      sourceItem.innerHTML = `
        <img src="${source.thumbnail.toDataURL()}" alt="${source.name}">
        <p>${source.name}</p>
      `;
      sourceItem.addEventListener('click', () => selectSource(source));
      sourceList.appendChild(sourceItem);
    });
    
    sourceModal.classList.add('active');
  } catch (error) {
    console.error('Error getting sources:', error);
    updateStatus('Error loading sources', false);
  }
}

// Select a source
async function selectSource(source) {
  selectedSource = source;
  sourceModal.classList.remove('active');
  startCaptureBtn.disabled = false;
  updateStatus(`Selected: ${source.name}`, false);
}

// Start capturing
async function startCapture() {
  if (!selectedSource) return;
  
  try {
    // Get media stream from selected source
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id
        }
      }
    });
    
    // Create video element to capture frames
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.style.display = 'none';
      document.body.appendChild(videoElement);
    }
    
    if (!canvasElement) {
      canvasElement = document.createElement('canvas');
      canvasElement.style.display = 'none';
      document.body.appendChild(canvasElement);
    }
    
    videoElement.srcObject = mediaStream;
    videoElement.play();
    
    // Update UI
    startCaptureBtn.disabled = true;
    stopCaptureBtn.disabled = false;
    selectSourceBtn.disabled = true;
    statusIndicator.classList.add('active');
    updateStatus('Monitoring...', true);
    
    // Start capture interval
    const refreshInterval = autoRefreshCheckbox.checked ? 3000 : 5000;
    captureInterval = setInterval(captureFrame, refreshInterval);
    
    // Capture first frame immediately
    setTimeout(captureFrame, 500);
    
  } catch (error) {
    console.error('Error starting capture:', error);
    updateStatus('Error: ' + error.message, false);
    stopCapture();
  }
}

// Stop capturing
function stopCapture() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  if (videoElement) {
    videoElement.srcObject = null;
  }
  
  startCaptureBtn.disabled = false;
  stopCaptureBtn.disabled = true;
  selectSourceBtn.disabled = false;
  statusIndicator.classList.remove('active');
  updateStatus('Stopped', false);
}

// Capture a frame and perform OCR
async function captureFrame() {
  if (!videoElement || !canvasElement) return;
  
  try {
    // Set canvas size to match video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Draw current frame to canvas
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    // Get image data
    const imageData = canvasElement.toDataURL('image/png');
    
    // For MVP, we'll simulate text extraction
    // In production, you would use Tesseract.js or similar OCR library
    const simulatedText = await simulateOCR(imageData);
    
    if (simulatedText) {
      capturedTextEl.textContent = simulatedText;
      
      // Get AI suggestions
      const analysis = await window.electronAPI.analyzeText(simulatedText);
      displaySuggestions(analysis.suggestions);
    }
    
  } catch (error) {
    console.error('Error capturing frame:', error);
  }
}

// Simulate OCR (in production, use Tesseract.js or Cloud Vision API)
async function simulateOCR(imageData) {
  // This is a simulation for MVP
  // In production, you would integrate actual OCR here
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] Screen content captured
  
This is a simulated text extraction for MVP demonstration.

To implement real OCR, you can integrate:
- Tesseract.js for client-side OCR
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision

The captured screen is being monitored continuously.
Interview questions and content will appear here.`;
}

// Display AI suggestions
function displaySuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    suggestionsEl.innerHTML = '<p class="placeholder">No suggestions at this time.</p>';
    return;
  }
  
  const ul = document.createElement('ul');
  suggestions.forEach(suggestion => {
    const li = document.createElement('li');
    li.textContent = suggestion;
    ul.appendChild(li);
  });
  
  suggestionsEl.innerHTML = '';
  suggestionsEl.appendChild(ul);
}

// Update status
function updateStatus(text, isActive) {
  statusText.textContent = text;
  if (isActive) {
    statusIndicator.classList.add('active');
  } else {
    statusIndicator.classList.remove('active');
  }
}

// Initialize the app
init();