document.addEventListener('DOMContentLoaded', function() {
    const messagesContainer = document.getElementById('messages');
    const queryInput = document.getElementById('query');
    const sendButton = document.getElementById('send');
    
    let isProcessing = false;
    const RATE_LIMIT_MS = 1000; // 1 second between requests
    let lastRequestTime = 0;

    // Add status indicator to the UI
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'llm-status';
    statusIndicator.className = 'status-indicator checking';
    document.querySelector('#chat-container').prepend(statusIndicator);

    // Add these functions for status management
    function updateStatus(status, message) {
        const indicator = document.getElementById('llm-status');
        indicator.className = `status-indicator ${status}`;
        indicator.title = message;
    }

    function checkLLMStatus() {
        updateStatus('checking', 'Checking LLM connection...');
        chrome.runtime.sendMessage({ action: "check_llm_status" }, (response) => {
            updateStatus(response.status, response.message);
        });
    }

    // Check status initially and every 30 seconds
    checkLLMStatus();
    setInterval(checkLLMStatus, 30000);

    function sanitizeInput(input) {
        return input.replace(/<[^>]*>/g, '').trim();
    }

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading';
        loadingDiv.id = 'loading-message';
        loadingDiv.textContent = 'Thinking...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeLoading() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    async function handleUserInput() {
        const now = Date.now();
        if (isProcessing || (now - lastRequestTime) < RATE_LIMIT_MS) {
            return;
        }

        const query = sanitizeInput(queryInput.value);
        if (!query) return;

        isProcessing = true;
        lastRequestTime = now;
        
        try {
            addMessage(query, true);
            queryInput.value = '';
            showLoading();

            chrome.runtime.sendMessage({
                action: "capture_screenshot",
                query: query
            });
        } catch (error) {
            removeLoading();
            addMessage("Error: Failed to send message", false);
        }
    }

    // Event listeners with debouncing
    let debounceTimer;
    sendButton.addEventListener('click', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleUserInput, 100);
    });
    
    queryInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(handleUserInput, 100);
        }
    });

    chrome.runtime.onMessage.addListener((message) => {
        isProcessing = false;
        if (message.action === "chat_response") {
            removeLoading();
            addMessage(message.response);
        }
    });

    // Initial greeting
    addMessage("Hello! How can I help you navigate this website?");
});
  
  