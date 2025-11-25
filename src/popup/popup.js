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
    let lastScannedUrl = null; // Track the last URL we scanned

    // Initialize
    const folderInput = document.getElementById('folder-name');

    // Load folder name
    chrome.storage.sync.get({ folderName: 'Classroom_Downloads' }, (items) => {
        folderInput.value = items.folderName;
    });

    // Save folder name on change
    folderInput.addEventListener('change', () => {
        chrome.storage.sync.set({ folderName: folderInput.value });
    });

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
        lastScannedUrl = null; // Clear URL tracking
        scanForFiles();
    });

    function scanForFiles() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];

            // Check if URL has changed (navigated to different class)
            if (lastScannedUrl && lastScannedUrl !== activeTab.url) {
                console.log("URL changed, clearing previous files");
                detectedFiles = [];
                fileList.innerHTML = '';
            }
            lastScannedUrl = activeTab.url;

            if (activeTab.url.includes("classroom.google.com")) {
                statusDiv.textContent = "Expanding class items... (This may take a moment)";

                // Send EXPAND_AND_SCRAPE message
                chrome.tabs.sendMessage(activeTab.id, { action: "EXPAND_AND_SCRAPE" }, (response) => {
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
                                chrome.tabs.sendMessage(activeTab.id, { action: "EXPAND_AND_SCRAPE" }, (response) => {
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

        // Load settings to filter files
        chrome.storage.sync.get({
            fileTypes: {
                pdf: true,
                doc: true,
                sheet: true,
                slide: true,
                image: true,
                video: true,
                zip: true,
                binary: true
            }
        }, (settings) => {
            // Filter files based on enabled types
            const filteredFiles = files.filter(file => isFileTypeEnabled(file.type, settings.fileTypes));

            if (filteredFiles.length === 0) {
                statusDiv.textContent = `Found ${files.length} files, but none match your settings.`;
                downloadBtn.disabled = true;
                return;
            }

            statusDiv.textContent = `Found ${filteredFiles.length} of ${files.length} files (filtered by settings).`;
            downloadBtn.disabled = false;

            filteredFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.dataset.index = files.indexOf(file); // Use original index

                const label = document.createElement('span');
                label.textContent = file.title; // Just show the title
                label.title = file.url; // URL on hover

                item.appendChild(checkbox);
                item.appendChild(label);
                fileList.appendChild(item);
            });
        });
    }

    function isFileTypeEnabled(type, enabledTypes) {
        switch (type) {
            case "BINARY": return enabledTypes.binary;
            case "DRIVE_LINK": return enabledTypes.binary;
            case "DOC": return enabledTypes.doc;
            case "SHEET": return enabledTypes.sheet;
            case "SLIDE": return enabledTypes.slide;
            case "OFFICE_DOC": return enabledTypes.doc;
            case "OFFICE_SHEET": return enabledTypes.sheet;
            case "OFFICE_SLIDE": return enabledTypes.slide;
            case "PDF": return enabledTypes.pdf;
            case "IMAGE": return enabledTypes.image;
            case "VIDEO": return enabledTypes.video;
            case "ZIP": return enabledTypes.zip;
            default: return true;
        }
    }

    downloadBtn.addEventListener('click', () => {
        const selectedIndices = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.dataset.index));

        const filesToDownload = detectedFiles.filter((_, index) => selectedIndices.includes(index));

        if (filesToDownload.length > 0) {
            // Save the folder name first to ensure background script gets the latest
            const currentFolderName = document.getElementById('folder-name').value;
            chrome.storage.sync.set({ folderName: currentFolderName }, () => {
                chrome.runtime.sendMessage({ action: "DOWNLOAD_FILES", files: filesToDownload }, (response) => {
                    statusDiv.textContent = `Started ${filesToDownload.length} downloads...`;
                });
            });
        } else {
            statusDiv.textContent = "No files selected.";
        }
    });
});

