// UI Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const status = document.getElementById('status');

// State
let isProcessing = false;

// Add message to chat
function addMessage(text, type = 'user') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  messagesContainer.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message handler
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isProcessing) return;
  
  isProcessing = true;
  sendBtn.disabled = true;
  status.textContent = 'Sending...';
  
  // Add user message
  addMessage(text, 'user');
  messageInput.value = '';
  
  try {
    // Send to main process
    const response = await window.electronAPI.sendMessage(text);
    
    // Add assistant response
    addMessage(response.response, 'assistant');
    status.textContent = 'Ready';
  } catch (error) {
    console.error('Error sending message:', error);
    addMessage('Error: Could not send message', 'assistant');
    status.textContent = 'Error occurred';
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
  }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

minimizeBtn.addEventListener('click', async () => {
  await window.electronAPI.minimizeOverlay();
});

// Initialize
messageInput.focus();

// Update status with current state
(async () => {
  try {
    const state = await window.electronAPI.getState();
    console.log('Overlay state:', state);
  } catch (error) {
    console.error('Error getting state:', error);
  }
})();