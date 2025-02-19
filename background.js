// Add this at the top of your background.js
chrome.runtime.onInstalled.addListener(async () => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    
    // Check if API key exists in storage
    const result = await chrome.storage.local.get(['gemini_api_key']);
    if (!result.gemini_api_key) {
        // Set a default API key or prompt user to enter one
        await chrome.storage.local.set({
            gemini_api_key: "YOUR_DEFAULT_API_KEY" // Replace with your actual API key
        });
    }
});

// Constants
const API_CONFIG = {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash"
};

// Remove duplicate listener since we're using setPanelBehavior
// chrome.action.onClicked.addListener((tab) => {
//     chrome.sidePanel.open({ windowId: tab.windowId });
// });

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "capture_screenshot") {
        try {
            await chrome.tabs.captureVisibleTab(null, { format: "png" }, async (image) => {
                if (!image) {
                    throw new Error("Failed to capture screenshot");
                }
                await processQuery(message.query, image);
            });
        } catch (error) {
            handleError("Screenshot capture failed", error);
        }
    }
    if (message.action === "check_llm_status") {
        checkApiConnection().then(sendResponse);
        return true;
    }
    return true;
});

async function processQuery(query, image) {
    try {
        if (!query || !image) {
            throw new Error("Missing query or image data");
        }

        const base64Image = image.replace(/^data:image\/png;base64,/, '');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error("No active tab found");
        }

        const pageData = await getPageData(tab);
        await sendApiRequest(query, base64Image, pageData);
    } catch (error) {
        handleError("Query processing failed", error);
    }
}

async function getPageData(tab) {
    try {
        const pageData = await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: "extract_page_data" }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Content script timeout")), 5000))
        ]);
        return pageData;
    } catch (error) {
        console.warn("Failed to get page data:", error);
        return {
            title: tab.title || "Unknown",
            url: tab.url || "Unknown",
            text: "Page content unavailable"
        };
    }
}

async function sendApiRequest(query, base64Image, pageData) {
    // Get API key from storage
    const result = await chrome.storage.local.get(['gemini_api_key']);
    const apiKey = result.gemini_api_key;
    
    if (!apiKey) {
        throw new Error("API key not found");
    }

    const response = await fetch(`${API_CONFIG.baseUrl}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {
                        text: `Context: ${pageData.title}\nURL: ${pageData.url}\nPage Content: ${pageData.text}\n\nUser Question: ${query}`
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        })
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    handleResponse(data);
}

function handleResponse(data) {
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid API response format");
    }
    chrome.runtime.sendMessage({ 
        action: "chat_response", 
        response: data.candidates[0].content.parts[0].text 
    });
}

function handleError(context, error) {
    console.error(`${context}:`, error);
    chrome.runtime.sendMessage({ 
        action: "chat_response", 
        response: `Error: ${context}. ${error.message}` 
    });
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