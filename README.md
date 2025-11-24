# Google Classroom Bulk Downloader

A Chromium extension that automatically extracts and downloads study materials (PDF, PPT, DOCX, images, videos, etc.) from Google Classroom Classwork pages.

## Features

-   **Automatic Extraction**: Detects attachments on the Classwork page.
-   **Bulk Download**: Download all files with a single click.
-   **Smart Conversion**: Converts Google Docs/Sheets/Slides to PDF automatically.
-   **Configurable**: Choose which file types to download and where to save them.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the `GCNotesDownloader` folder.

## Usage

1.  Go to a Google Classroom **Classwork** page.
2.  Click the extension icon.
3.  Select the files you want to download.
4.  Click **Download All**.

## Options

Right-click the extension icon and select **Options** to:
-   Filter file types (PDF, Docs, etc.)
-   Change the destination folder name.

## Permissions

-   `activeTab`: To scrape the current page.
-   `scripting`: To inject the scraper.
-   `downloads`: To download files.
-   `storage`: To save your preferences.
-   `host_permissions`: Access to `classroom.google.com` and `drive.google.com`.
