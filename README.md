# Google Indexing API Utility

Automates URL submission to Google's Indexing API for rapid indexing.

## Features
- Batch URL processing
- API error handling
- JSON configuration support

## Quick Start
```bash
Start with npm install (installing all the node modules required by the project)
Run :- node listing-fetcher.js to fetch all the listing urls saved in products-sitemap.xml (which will get last 100 urls saved in urls-to-index.txt)
Run :- node indexing-automator.js to index all the urls saved in urls-to-index.txt
Run :- node find-status.js to get the status of website urls.
```

## Requirements
- Node.js 18+
- Google API service account credentials
- Enable Google Search Console api in Google console platform 
- Generate a service-account key and add the same services account in google search console

ℹ️ Create credentials in [Google Cloud Console](https://console.cloud.google.com/) and enable Indexing API
