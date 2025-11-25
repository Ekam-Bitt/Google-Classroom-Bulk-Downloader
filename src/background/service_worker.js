
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_FILES") {
        downloadFiles(request.files);
        sendResponse({ status: "started" });
    }
    return true;
});


async function downloadFiles(files) {
    // Get settings from storage
    const settings = await chrome.storage.sync.get({
        fileTypes: {
            pdf: true,
            doc: true,
            sheet: true,
            slide: true,
            binary: true
        },
        folderName: 'Classroom_Downloads'
    });

    for (const file of files) {
        // Check if file type is enabled
        if (!isFileTypeEnabled(file.type, settings.fileTypes)) {
            console.log(`Skipping ${file.type} file: ${file.title}`);
            continue;
        }

        const downloadUrl = convertToDownloadUrl(file.url, file.type);
        if (downloadUrl) {
            try {
                await chrome.downloads.download({
                    url: downloadUrl,
                    filename: sanitizeFilename(file.title, file.type, settings.folderName),
                    conflictAction: "uniquify"
                });
            } catch (error) {
                console.error("Download failed for:", file.title, error);
            }
        }
    }
}

function isFileTypeEnabled(type, enabledTypes) {
    switch (type) {
        case "BINARY": return enabledTypes.binary;
        case "DRIVE_LINK": return enabledTypes.binary;
        case "DOC": return enabledTypes.doc;
        case "SHEET": return enabledTypes.sheet;
        case "SLIDE": return enabledTypes.slide;
        case "OFFICE_DOC": return enabledTypes.doc; // Uploaded Word docs
        case "OFFICE_SHEET": return enabledTypes.sheet; // Uploaded Excel files
        case "OFFICE_SLIDE": return enabledTypes.slide; // Uploaded PowerPoint files
        case "PDF": return enabledTypes.pdf;
        case "IMAGE": return enabledTypes.binary;
        case "VIDEO": return enabledTypes.binary;
        case "ZIP": return enabledTypes.binary;
        default: return true;
    }
}

function convertToDownloadUrl(url, type) {
    try {
        const urlObj = new URL(url);
        let id = "";

        // Extract ID based on type
        if (type === "BINARY" || type === "DRIVE_LINK" || type === "PDF" || type === "IMAGE" || type === "VIDEO" || type === "ZIP" || type === "OFFICE_DOC" || type === "OFFICE_SHEET" || type === "OFFICE_SLIDE") {
            // https://drive.google.com/file/d/<ID>/view
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                id = match[1];
                return `https://drive.google.com/uc?export=download&id=${id}`;
            }
            // Handle open?id= format
            const idParam = urlObj.searchParams.get("id");
            if (idParam) {
                return `https://drive.google.com/uc?export=download&id=${idParam}`;
            }
        } else if (type === "DOC") {
            // https://docs.google.com/document/d/<ID>/edit
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                return `https://docs.google.com/document/d/${match[1]}/export?format=pdf`;
            }
        } else if (type === "SHEET") {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                // For sheets, we need to specify the export format differently
                return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=pdf&portrait=true&size=A4`;
            }
        } else if (type === "SLIDE") {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                // For slides, use the correct export path
                return `https://docs.google.com/presentation/d/${match[1]}/export/pdf`;
            }
        }
    } catch (e) {
        console.error("Error converting URL:", url, e);
    }
    return url; // Fallback to original URL if conversion fails
}


function sanitizeFilename(title, type, folderName) {
    // Remove illegal characters
    let safeTitle = title.replace(/[<>:"/\\|?*]/g, "_").trim();

    // Append extension if missing
    if (type === "DOC" || type === "SHEET" || type === "SLIDE") {
        if (!safeTitle.toLowerCase().endsWith(".pdf")) {
            safeTitle += ".pdf";
        }
    }

    // Use configured folder name
    const folder = folderName || "Classroom_Downloads";
    return folder + "/" + safeTitle;
}
