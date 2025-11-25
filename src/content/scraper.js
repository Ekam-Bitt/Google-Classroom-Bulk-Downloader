
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCRAPE_FILES") {
        const files = scrapeAttachments();
        sendResponse({ files: files });
    }
    return true; // Keep the message channel open for async response
});

function scrapeAttachments() {
    const files = [];
    const seenUrls = new Set();

    // Select all anchor tags that might be attachments
    // This is a broad selector, we will filter later
    const anchors = document.querySelectorAll('a[href*="drive.google.com"], a[href*="docs.google.com"]');

    anchors.forEach(anchor => {
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
            files.push({
                url: url,
                title: title || "Untitled",
                type: type
            });
            seenUrls.add(url);
        }
    });

    console.log(`[GC Downloader] Found ${files.length} files.`);
    return files;
}

function extractTitle(anchor) {
    // Try to get text content from the anchor itself
    let text = anchor.innerText.trim();
    if (text) return text;

    // Sometimes the title is in an aria-label
    if (anchor.getAttribute('aria-label')) {
        return anchor.getAttribute('aria-label');
    }

    // Or in a child element
    const titleElement = anchor.querySelector('[class*="title"], [class*="name"]');
    if (titleElement) return titleElement.innerText.trim();

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
