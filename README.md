# Google Classroom Bulk Downloader

A powerful Chrome extension that automatically extracts and downloads study materials (PDFs, Docs, Slides, Videos, etc.) from Google Classroom.

![GitHub Release](https://img.shields.io/github/v/release/Ekam-Bitt/Google-Classroom-Bulk-Downloader?include_prereleases)
![License](https://img.shields.io/github/license/Ekam-Bitt/Google-Classroom-Bulk-Downloader)
[![Documentation](https://img.shields.io/badge/docs-available-brightgreen)](./README.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

## 🚀 Features (V2)

*   **⚡️ Automated Expansion**: Automatically clicks "View More" buttons and expands all collapsed classwork items to find every single file.
*   **🔄 Smart Scrolling**: Handles virtual scrolling and dynamic content loading to ensure no file is missed.
*   **📂 Bulk Download**: Download dozens of files with a single click.
*   **📄 Smart Conversion**: Automatically converts Google Docs, Sheets, and Slides to PDF for offline viewing.
*   **⚙️ Advanced Filtering**: Choose exactly what you want to download (PDFs only, Videos, Images, etc.).
*   **🛡️ Privacy Focused**: Runs entirely on your device. No data is sent to external servers.

## 📥 Installation

### Method 1: Download Release (Recommended)
1.  Go to the [**Releases Page**](https://github.com/Ekam-Bitt/Google-Classroom-Bulk-Downloader/releases).
2.  Download the latest `extension.zip`.
3.  Unzip the file.
4.  Open Chrome and go to `chrome://extensions`.
5.  Enable **Developer mode** (top right toggle).
6.  Click **Load unpacked** and select the unzipped folder.

### Method 2: Build from Source
1.  Clone this repository:
    ```bash
    git clone https://github.com/Ekam-Bitt/Google-Classroom-Bulk-Downloader.git
    ```
2.  Load the folder in Chrome Extensions (Developer Mode).

## 📖 Usage

1.  Navigate to any **Google Classroom Classwork** page.
2.  Click the extension icon in your toolbar.
3.  **Wait a moment**: The extension will automatically scroll and expand all items to find files.
4.  Review the list of detected files.
5.  Click **Download Selected**.
6.  Files will be saved to your Downloads folder (default: `Classroom_Downloads/`).

## ⚙️ Configuration

Right-click the extension icon and select **Options** to:
*   Enable/Disable specific file types (e.g., "Only download PDFs").
*   Change the default subfolder name.

## 🔒 Permissions

*   `activeTab`: To read the current Classwork page.
*   `downloads`: To save files to your computer.
*   `storage`: To save your settings.
*   `scripting`: To automate the expansion of list items.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](LICENSE)
