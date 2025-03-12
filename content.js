

function extractPageData() {
    return {
        title: document.title,
        url: window.location.href,
        text: document.body.innerText.substring(0, 500)
    };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "extract_page_data") {
            const data = extractPageData();
            sendResponse(data);
        } else if (message.action === "execute_navigation") {
            navigationAgent.executeNavigationPlan(message.actions).then(() => {
                sendResponse({ status: 'executing' });
            }).catch(error => {
                sendResponse({ error: error.message });
            });
            return true; // Indicate asynchronous response
        }
    } catch (error) {
        console.error('Content script error:', error);
        sendResponse({ error: error.message });
    }
    return true;
});