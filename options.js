document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    // Load saved API key
    const result = await chrome.storage.local.get(['gemini_api_key']);
    if (result.gemini_api_key) {
        apiKeyInput.value = result.gemini_api_key;
    }

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    saveButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Please enter an API key', true);
            return;
        }

        try {
            await chrome.storage.local.set({ gemini_api_key: apiKey });
            showStatus('API key saved successfully!');
        } catch (error) {
            showStatus('Failed to save API key: ' + error.message, true);
        }
    });
}); 