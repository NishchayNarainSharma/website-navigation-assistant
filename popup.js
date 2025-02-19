document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    let isProcessing = false;
    const RATE_LIMIT_MS = 1000; // 1 second between requests
    let lastRequestTime = 0;

    function sanitizeInput(input) {
        return input.replace(/<[^>]*>/g, '').trim();
    }

    // Function to add messages to the chat container
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = message;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to show loading indicator
    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading';
        loadingDiv.id = 'loading-message';
        loadingDiv.textContent = 'Thinking...';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to remove loading indicator
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

        const query = sanitizeInput(userInput.value);
        if (!query) return;

        isProcessing = true;
        lastRequestTime = now;
        
        try {
            addMessage(query, true);
            userInput.value = '';
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        isProcessing = false;
        if (message.action === "chat_response") {
            removeLoading();
            addMessage(message.response);
        }
    });

    // Event listeners with debouncing
    let debounceTimer;
    sendButton.addEventListener('click', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleUserInput, 100);
    });
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(handleUserInput, 100);
        }
    });

    // Initial greeting
    addMessage("Hello! How can I help you navigate this website?");
});
