import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { readFile, appendFile } from 'fs/promises';

// 🔹 Service account key file
const KEY_FILE = './service-account-key.json'; // Make sure this file exists
const URLS_FILE = './urls-to-index.txt';
const BATCH_SIZE = 100; // Number of URLs to process in each batch

// 🔹 Authenticate using JWT (Service Account)
const auth = new JWT({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/indexing']
});

const indexingApi = google.indexing({
  version: 'v3',
  auth
});

// Function to split URLs into batches
function createBatches(urls, batchSize) {
  const batches = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  return batches;
}

async function submitUrlsToIndex() {
  console.log(`[${new Date().toISOString()}] Starting URL submission`);

  try {
    const urls = await readFile(URLS_FILE, 'utf-8');
    const urlList = urls.split('\n').filter(url => url.trim() !== '');

    if (urlList.length === 0) {
      console.error("❌ No URLs found in the file. Exiting...");
      process.exit(1);
    }

    // Split URLs into batches
    const batches = createBatches(urlList, BATCH_SIZE);

    for (const batch of batches) {
      console.log(`📤 Processing batch of ${batch.length} URLs...`);

      for (const url of batch) {
        try {
          const response = await indexingApi.urlNotifications.publish({
            requestBody: { url, type: 'URL_UPDATED' }
          });

          console.log(`✅ Submitted: ${url}`);
          await appendFile('submission.log',
            `[${new Date().toISOString()}] ${url} - Success\n`
          );

          // 🔹 Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error submitting ${url}:`, error.response?.data || error.message);
          await appendFile('error.log',
            `[${new Date().toISOString()}] ${url} - ${error.response?.data || error.message}\n`
          );
          process.exit(1); // Exit if a URL submission fails
        }
      }

      console.log(`✅ Batch completed. Waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between batches
    }
  } catch (error) {
    console.error('❌ Critical error:', error.message);
    process.exit(1); // Exit if a major error occurs
  }
}

// Run the job immediately and exit on failure
(async () => {
  console.log('🚀 Starting manual indexing job...');
  await submitUrlsToIndex();
  console.log('✅ Indexing job completed!');
  process.exit(0); // Ensure the script exits successfully
})();