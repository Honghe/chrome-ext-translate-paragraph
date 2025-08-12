// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
        fetch("https://translate-pa.googleapis.com/v1/translateHtml", {
            method: "POST",
            headers: {
                "content-type": "application/json+protobuf",
                "x-goog-api-key": "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520"
            },
            body: JSON.stringify([[[request.text], "auto", "zh-CN"], "te_lib"])
        })
        .then(response => response.json())
        .then(data => {
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Will respond asynchronously
    }
});
