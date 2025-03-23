import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { readFile, writeFile } from 'fs/promises';  // ✅ Fix: Add writeFile
import { parse } from 'json2csv';

const KEY_FILE = './service-account-key.json';
const URLS_FILE = './urls-to-index.txt';
const REPORT_FILE = './indexing_report.csv';

const auth = new JWT({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/webmasters']
});

const searchConsole = google.searchconsole({
  version: 'v1',
  auth
});

async function getUrlsFromFile() {
  try {
    const logContent = await readFile(URLS_FILE, 'utf-8');
    return logContent.split('\n').map(url => url.trim()).filter(url => url.startsWith('http'));
  } catch (error) {
    console.error('❌ Error reading URLs file:', error.message);
    return [];
  }
}

async function checkIndexingStatus(url) {
  try {
    const response = await searchConsole.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: 'https://www.yourwebsite.com/' }
    });

    const indexStatus = response.data.inspectionResult?.indexStatusResult;
    return indexStatus ? {
      url,
      verdict: indexStatus.verdict || 'N/A',
      coverageState: indexStatus.coverageState || 'N/A',
      lastCrawlTime: indexStatus.lastCrawlTime || 'N/A',
      googleCanonical: indexStatus.googleCanonical || 'N/A'
    } : { url, verdict: 'No Data', coverageState: 'No Data', lastCrawlTime: 'No Data', googleCanonical: 'No Data' };
  } catch (error) {
    console.error(`❌ Error checking ${url}:`, error.response?.data || error.message);
    return { url, verdict: 'Error', coverageState: 'Error', lastCrawlTime: 'Error', googleCanonical: 'Error' };
  }
}

(async () => {
  console.log('🚀 Starting URL verification...');
  const urls = await getUrlsFromFile();
  if (urls.length === 0) {
    console.log('❌ No URLs found in the file.');
    process.exit(1);
  }

  console.log(`📄 Found ${urls.length} URLs in the file.`);
  const results = await Promise.all(urls.map(url => checkIndexingStatus(url)));

  const csv = parse(results, { fields: ['url', 'verdict', 'coverageState', 'lastCrawlTime', 'googleCanonical'] });
  await writeFile(REPORT_FILE, csv, 'utf-8');  // ✅ Fix applied here

  console.log(`✅ URL verification completed! Report saved as: ${REPORT_FILE}`);
})();
