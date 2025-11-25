
// Saves options to chrome.storage
function saveOptions() {
    const fileTypes = {
        pdf: document.getElementById('type-pdf').checked,
        doc: document.getElementById('type-doc').checked,
        sheet: document.getElementById('type-sheet').checked,
        slide: document.getElementById('type-slide').checked,
        image: document.getElementById('type-image').checked,
        video: document.getElementById('type-video').checked,
        zip: document.getElementById('type-zip').checked,
        binary: document.getElementById('type-binary').checked
    };



    chrome.storage.sync.set({
        fileTypes: fileTypes
    }, () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
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
    }, (items) => {
        document.getElementById('type-pdf').checked = items.fileTypes.pdf;
        document.getElementById('type-doc').checked = items.fileTypes.doc;
        document.getElementById('type-sheet').checked = items.fileTypes.sheet;
        document.getElementById('type-slide').checked = items.fileTypes.slide;
        document.getElementById('type-image').checked = items.fileTypes.image;
        document.getElementById('type-video').checked = items.fileTypes.video;
        document.getElementById('type-zip').checked = items.fileTypes.zip;
        document.getElementById('type-binary').checked = items.fileTypes.binary;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save-btn').addEventListener('click', saveOptions);

document.getElementById('select-all-btn').addEventListener('click', () => {
    toggleAllCheckboxes(true);
});

document.getElementById('deselect-all-btn').addEventListener('click', () => {
    toggleAllCheckboxes(false);
});

function toggleAllCheckboxes(checked) {
    const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = checked);
}
