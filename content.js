function extractPageData() {
    return {
        title: document.title,
        url: window.location.href,
        text: document.body.innerText.substring(0, 500)
    };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extract_page_data") {
        sendResponse(extractPageData());
    }
    return true;
});