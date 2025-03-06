let activeTabId = null;
let isInitializedContentJs = false;

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "createNote",
        title: "Add a Note Here",
        contexts: ["page", "selection"]
    });

    chrome.storage.sync.set({
        settings: {
            defaultColor: '#ffd75e',
            syncEnabled: false
        }
    });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "createNote") {
        try {

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.contentScriptInjected || false
            });

            if (!result) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['js/content.js']
                });
                console.log("Script injected successfully.");
            } else {
                console.log("content.js already injected into tab:", tab.id);
            }

            await chrome.tabs.sendMessage(tab.id, {
                type: "createNote",
                text: info.selectionText || ""
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getSettings') {
        chrome.storage.sync.get('settings', (data) => {
            sendResponse(data.settings);
        });
        return true;
    }
});