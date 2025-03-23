import { readFile, appendFile, writeFile } from 'fs/promises';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const URLS_FILE = './urls-to-index.txt';
const LAST_RUN_FILE = './last-run.txt';
const SITEMAP_URL = 'https://www.youwebsite.com/sitemap.xml';

// Configure XML parser for sitemap variations
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value',
  parseAttributeValue: true,
  allowBooleanAttributes: true,
  ignoreNameSpace: true
});

async function fetchSitemapUrls() {
  try {
    const response = await axios.get(SITEMAP_URL, {
      timeout: 10000,
      headers: { 'User-Agent': 'GoogleIndexingBot/1.0' }
    });

    const parsed = parser.parse(response.data);
    const entries = parsed?.urlset?.url || parsed?.UrlSet?.Url || [];

    const urls = entries
      .map(entry => entry.loc || entry.Loc)
      .filter(url => typeof url === 'string' && url.includes('/buy-used-cars/'))
      .map(url => url.trim());

    console.log('📥 Fetched URLs from sitemap:', urls);
    return urls;
  } catch (error) {
    console.error(`Sitemap fetch failed: ${error.message}`);
    return [];
  }
}

async function updateIndexingList() {
  const existingUrls = (await readFile(URLS_FILE, 'utf-8').catch(() => ''))
    .split('\n')
    .filter(Boolean);

  const sitemapUrls = await fetchSitemapUrls();

  // New logic: Merge and deduplicate
  const uniqueUrls = [...new Set([...existingUrls, ...sitemapUrls])];
  const newUrls = uniqueUrls.filter(url => !existingUrls.includes(url));

  if (newUrls.length > 0) {
    // Write all unique URLs to the file
    await writeFile(URLS_FILE, uniqueUrls.join('\n'));
    console.log(`Added ${newUrls.length} new URLs (Total: ${uniqueUrls.length})`);
  }

  // Always update last run time
  await writeFile(LAST_RUN_FILE, new Date().toISOString());

  // Return the full list of unique URLs for batching
  return uniqueUrls;
}

async function getLastRunTime() {
  try {
    const lastRun = await readFile(LAST_RUN_FILE, 'utf-8');
    const date = new Date(lastRun.trim());

    // Validate the date
    if (isNaN(date)) {
      console.log('⚠️ Invalid date in last-run.txt, using default');
      return new Date(Date.now() - 86400000);
    }

    return date;
  } catch {
    console.log('⏳ No previous run found, using 24h default');
    return new Date(Date.now() - 86400000);
  }
}

// Function to split URLs into batches of 100
function createBatches(urls, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  return batches;
}

// Run with error handling
(async () => {
  try {
    const allUrls = await updateIndexingList();
    const batches = createBatches(allUrls);

    console.log(`🔄 Created ${batches.length} batches of URLs for indexing.`);

    // Process each batch (e.g., send to indexing API)
    for (const batch of batches) {
      console.log(`📤 Processing batch with ${batch.length} URLs:`);
      console.log(batch);

      // Here you would call your indexing API with the batch
      // Example: await submitUrlsToIndexingAPI(batch);
    }

    process.exit(0);
  } catch (error) {
    console.error('🛑 Critical error:', error.message);
    process.exit(1);
  }
})();