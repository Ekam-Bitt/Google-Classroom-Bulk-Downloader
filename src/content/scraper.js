// Global state for collected files (reset on each new request)
let collectedFiles = [];
let collectedUrls = new Set();

// Listen for messages from the popup
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "SCRAPE_FILES") {
            // Legacy support or direct scrape
            const files = scrapeVisibleAttachments();
            sendResponse({ files: files });
        } else if (request.action === "EXPAND_AND_SCRAPE") {
            // New V2 action: Expand then scrape
            expandAndCollect().then((files) => {
                sendResponse({ files: files });
            });
            return true; // Keep channel open for async response
        }
        return true; // Keep the message channel open for async response
    });
}

async function expandAndCollect() {
    // Reset collection
    collectedFiles = [];
    collectedUrls = new Set();

    // 1. Check for "View more" button and click it repeatedly until gone
    while (true) {
        let viewMoreBtn = null;
        // Retry for up to 5 seconds to handle slow SPA transitions
        for (let i = 0; i < 10; i++) {
            // Use querySelectorAll to find ALL buttons, then find the visible one
            // This handles cases where old hidden buttons remain in the DOM
            const allBtns = Array.from(document.querySelectorAll('button[aria-label="View more posts"]'));
            viewMoreBtn = allBtns.find(btn => btn.offsetParent !== null);

            if (viewMoreBtn) break; // Found and visible
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (viewMoreBtn) {
            console.log("Found 'View more' button, clicking...");
            viewMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            viewMoreBtn.click();
            // Wait for new items to load
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log("No more 'View more' buttons found.");
            break; // Exit loop if no button found
        }
    }

    // 2. Find all collapsed items
    // Selector based on analysis: div[jsname="rQC7Ie"][aria-expanded="false"]
    // This is the clickable header of the classwork item
    const collapsedItems = Array.from(document.querySelectorAll('div[jsname="rQC7Ie"][aria-expanded="false"]'));

    // Also scrape whatever is currently visible before we start expanding
    scrapeVisibleAttachments(true);

    if (collapsedItems.length > 0) {
        // 3. Expand items sequentially
        for (const item of collapsedItems) {
            // Check if item is still in DOM and visible
            if (!item.isConnected || item.offsetParent === null) continue;

            // Scroll into view to ensure clickability
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Click the item
            item.click();

            // Wait a bit for expansion and DOM mutation
            // Google Classroom loads attachments dynamically
            await new Promise(resolve => setTimeout(resolve, 800));

            // Scrape immediately after expansion while item is in view
            scrapeVisibleAttachments(true);
        }
    }

    // Final scrape to catch anything else
    scrapeVisibleAttachments(true);

    console.log(`[GC Downloader] Total unique files collected: ${collectedFiles.length}`);
    return collectedFiles;
}

function scrapeVisibleAttachments(accumulate = false) {
    const files = accumulate ? collectedFiles : [];
    const seenUrls = accumulate ? collectedUrls : new Set();

    // Select all anchor tags that might be attachments
    // This is a broad selector, we will filter later
    const anchors = document.querySelectorAll('a[href*="drive.google.com"], a[href*="docs.google.com"]');

    anchors.forEach(anchor => {
        // Check if element is visible
        // IMPORTANT: We need to check if the anchor OR its parents are visible.
        // offsetParent is null if display:none, but sometimes elements are just off-screen.
        // However, for stale data (hidden views), offsetParent should be null.
        if (anchor.offsetParent === null) return;

        let url = anchor.href;

        // Clean up URL
        try {
            const urlObj = new URL(url);
            // Remove tracking params if any, but keep ID
            // For now, just using the full URL as base
            url = urlObj.href;
        } catch (e) {
            console.error("Invalid URL:", url);
            return;
        }

        if (seenUrls.has(url)) return;

        const title = extractTitle(anchor);
        const type = determineFileType(url, title);

        if (type) {
            const fileObj = {
                url: url,
                title: title || "Untitled",
                type: type
            };
            files.push(fileObj);
            seenUrls.add(url);
        }
    });

    if (!accumulate) {
        console.log(`[GC Downloader] Found ${files.length} files.`);
    }
    return files;
}

function extractTitle(anchor) {
    // 1. Try to get text content from the anchor itself
    let text = anchor.innerText.trim();

    // Split by newline to handle cases where "PDF" is on a separate line
    // e.g. "PDF\nMyFile.pdf"
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l);

    // Prioritize lines ending in common extensions
    const extRegex = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt|jpg|png|mp4|mov)$/i;
    const filenameLine = lines.find(l => extRegex.test(l));

    if (filenameLine) return filenameLine;

    // 2. Fallback: Try aria-label
    const ariaLabel = anchor.getAttribute('aria-label');
    if (ariaLabel) {
        // Clean "Attachment: "
        return ariaLabel.replace(/^Attachment:\s*/i, "");
    }

    // 3. Or in a child element
    const titleElement = anchor.querySelector('[class*="title"], [class*="name"]');
    if (titleElement) return titleElement.innerText.trim();

    // 4. Fallback to first line of text if available
    if (lines.length > 0) return lines[0];

    return "Unknown File";
}

function determineFileType(url, title) {
    // Check URL specific patterns first for Google Docs (native Google format)
    if (url.includes("/document/d/")) return "DOC";
    if (url.includes("/spreadsheets/d/")) return "SHEET";
    if (url.includes("/presentation/d/")) return "SLIDE";

    // Check extensions in title for uploaded files
    const lowerTitle = title.toLowerCase();

    // Office documents (uploaded, not Google Docs)
    if (lowerTitle.match(/\.(doc|docx)$/)) return "OFFICE_DOC";
    if (lowerTitle.match(/\.(xls|xlsx)$/)) return "OFFICE_SHEET";
    if (lowerTitle.match(/\.(ppt|pptx)$/)) return "OFFICE_SLIDE";

    // Other file types
    if (lowerTitle.endsWith(".pdf")) return "PDF";
    if (lowerTitle.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "IMAGE";
    if (lowerTitle.match(/\.(mp4|mov|avi|mkv|webm)$/)) return "VIDEO";
    if (lowerTitle.match(/\.(zip|rar|7z|tar|gz)$/)) return "ZIP";

    // Fallback to URL patterns for binary
    if (url.includes("/file/d/")) return "BINARY"; // Generic binary if no extension match
    if (url.includes("drive.google.com/open")) return "DRIVE_LINK"; // Generic Drive link

    return null;
}
