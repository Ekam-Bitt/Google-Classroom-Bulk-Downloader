document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');
    const downloadBtn = document.getElementById('download-btn');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    // Insert status before file list within the app container
    fileList.parentNode.insertBefore(statusDiv, fileList);

    const settingsBtn = document.getElementById('settings-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    let detectedFiles = [];

    // Initialize
    scanForFiles();

    settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('src/options/options.html'));
        }
    });

    refreshBtn.addEventListener('click', () => {
        detectedFiles = [];
        fileList.innerHTML = '';
        statusDiv.textContent = "Refreshing...";
        downloadBtn.disabled = true;
        scanForFiles();
    });

    function scanForFiles() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab.url.includes("classroom.google.com")) {
                statusDiv.textContent = "Scanning for files...";

                // Try to send message
                chrome.tabs.sendMessage(activeTab.id, { action: "SCRAPE_FILES" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Connection failed, attempting to inject script...");
                        // If message fails, script might not be loaded. Inject it.
                        chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['src/content/scraper.js']
                        }, () => {
                            if (chrome.runtime.lastError) {
                                statusDiv.textContent = "Error: Cannot access page. Try refreshing the tab.";
                                console.error(chrome.runtime.lastError);
                                return;
                            }
                            // Retry sending message after injection
                            setTimeout(() => {
                                chrome.tabs.sendMessage(activeTab.id, { action: "SCRAPE_FILES" }, (response) => {
                                    handleResponse(response);
                                });
                            }, 100);
                        });
                        return;
                    }
                    handleResponse(response);
                });
            } else {
                statusDiv.textContent = "Please navigate to a Google Classroom Classwork page.";
                downloadBtn.disabled = true;
            }
        });
    }

    function handleResponse(response) {
        if (chrome.runtime.lastError) {
            // This is expected if the script was just injected and hasn't responded yet, 
            // or if the page is restricted.
            console.log("Runtime error in handleResponse:", chrome.runtime.lastError);
            // Don't show error immediately if we are retrying, but here we are in the callback.
            // If response is undefined, it might mean the message port closed.
        }

        if (!response) {
            // If response is undefined/null but no runtime error, it might be a silent failure 
            // or the content script didn't send a response.
            console.log("No response received from content script.");
            return;
        }

        if (response.files) {
            detectedFiles = response.files;
            renderFiles(detectedFiles);
        } else {
            statusDiv.textContent = "No files found.";
        }
    }

    function renderFiles(files) {
        fileList.innerHTML = '';
        if (files.length === 0) {
            statusDiv.textContent = "No files found on this page.";
            downloadBtn.disabled = true;
            return;
        }

        statusDiv.textContent = `Found ${files.length} files.`;
        downloadBtn.disabled = false;

        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.index = index;

            const label = document.createElement('span');
            label.textContent = `${file.title} (${file.type})`;
            label.title = file.url;

            item.appendChild(checkbox);
            item.appendChild(label);
            fileList.appendChild(item);
        });
    }

    downloadBtn.addEventListener('click', () => {
        const selectedIndices = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.dataset.index));

        const filesToDownload = detectedFiles.filter((_, index) => selectedIndices.includes(index));

        if (filesToDownload.length > 0) {
            chrome.runtime.sendMessage({ action: "DOWNLOAD_FILES", files: filesToDownload }, (response) => {
                statusDiv.textContent = `Started ${filesToDownload.length} downloads...`;
            });
        } else {
            statusDiv.textContent = "No files selected.";
        }
    });
});

