// Add this at the top of your background.js
chrome.runtime.onInstalled.addListener(async () => {
    try {
        // Initialize side panel
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        
        // Check if API key exists
        const result = await chrome.storage.local.get(['gemini_api_key']);
        if (!result.gemini_api_key) {
            // Set a default or empty API key
            await chrome.storage.local.set({
                gemini_api_key: '' // Empty string or your default API key
            });
            
            // Open options page for user to enter API key
            chrome.runtime.openOptionsPage();
        }
    } catch (error) {
        console.error('Storage initialization failed:', error);
    }
});

// Constants
const API_CONFIG = {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash"
};

// Named function for installation
function handleInstalled() {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    initializeStorage();
}

// Named function for storage initialization
async function initializeStorage() {
    try {
        const result = await chrome.storage.local.get(['gemini_api_key']);
        if (!result.gemini_api_key) {
            await chrome.storage.local.set({
                gemini_api_key: '' // Empty string or your default API key
            });
            chrome.runtime.openOptionsPage();
        }
    } catch (error) {
        console.error('Storage initialization failed:', error);
    }
}

// Named function for message handling
function handleMessage(message, sender, sendResponse) {
    if (message.action === "capture_screenshot") {
        handleScreenshotCapture(message.query);
    }
    if (message.action === "check_llm_status") {
        checkApiConnection().then(sendResponse);
        return true;
    }
    return true;
}

// Named function for screenshot capture
async function handleScreenshotCapture(query) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            throw new Error("No active tab found");
        }

        const tab = tabs[0];
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => true
        });

        const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png'
        });
        
        if (!screenshot) {
            throw new Error("Screenshot capture failed");
        }

        await processQuery(query, screenshot);
    } catch (error) {
        console.error('Screenshot error:', error);
        chrome.runtime.sendMessage({
            action: "chat_response",
            response: "Error: Failed to capture screenshot. " + error.message
        });
    }
}

// Add event listeners using named functions
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);

// Add action click listener to properly invoke the extension
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // This will invoke the extension and enable activeTab
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // This ensures the extension is properly invoked
                console.log('Extension activated');
            }
        });
        
        // Capture screenshot after activation
        const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png'
        });
        
        if (screenshot) {
            console.log('Screenshot captured successfully');
        }
        
        // Open the side panel after activation
        chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
        console.error('Activation or screenshot failed:', error);
    }
});

// Add helper function for API key retrieval
async function getApiKey() {
    try {
        const result = await chrome.storage.local.get(['gemini_api_key']);
        if (!result.gemini_api_key) {
            throw new Error('API key not found. Please set it in the extension options.');
        }
        return result.gemini_api_key;
    } catch (error) {
        console.error('Failed to get API key:', error);
        throw error;
    }
}

// Update your processQuery function to use the new helper
async function processQuery(query, screenshot) {
    try {
        const apiKey = await getApiKey();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error("No active tab found");
        }

        const pageData = await getPageData(tab);
        
        console.log('Sending API request with the following data:', {
            query,
            screenshot: screenshot.substring(0, 30) + '...', // Log only the first 30 characters
            pageData
        });

        const response = await fetch(`${API_CONFIG.baseUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: query },
                        { inlineData: { mimeType: "image/png", data: screenshot.split(',')[1] } },
                        { text: `Page Title: ${pageData.title}\nURL: ${pageData.url}\nContent: ${pageData.text}` }
                    ]
                }]
            })
        });

        console.log('API response status:', response.status);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data);

        chrome.runtime.sendMessage({
            action: "chat_response",
            response: data.candidates[0].content.parts[0].text
        });

    } catch (error) {
        console.error('Process query error:', error);
        chrome.runtime.sendMessage({
            action: "chat_response",
            response: "Error: " + error.message
        });
    }
}

async function getPageData(tab) {
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract_page_data" });
        return response || {
            title: tab.title || "Unknown",
            url: tab.url || "Unknown",
            text: "Page content unavailable"
        };
    } catch (error) {
        console.warn("Failed to get page data:", error);
        return {
            title: tab.title || "Unknown",
            url: tab.url || "Unknown",
            text: "Page content unavailable"
        };
    }
}

// Add this function to check API connectivity
async function checkApiConnection() {
    try {
        const result = await chrome.storage.local.get(['gemini_api_key']);
        const apiKey = result.gemini_api_key;
        
        if (!apiKey) {
            return { status: 'error', message: 'API key not found' };
        }

        const response = await fetch(`${API_CONFIG.baseUrl}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "test" }] }]
            })
        });

        return {
            status: response.ok ? 'connected' : 'error',
            message: response.ok ? 'LLM Connected' : `API Error: ${response.status}`
        };
    } catch (error) {
        return { 
            status: 'error', 
            message: `Connection failed: ${error.message}` 
        };
    }
}

