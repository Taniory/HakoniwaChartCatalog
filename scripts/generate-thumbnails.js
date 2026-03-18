import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const POSTS_INDEX = path.join(ROOT_DIR, 'site/posts/index.json');
const THUMBNAILS_DIR = path.join(ROOT_DIR, 'public/thumbnails');
const SANDBOX_URL = 'http://localhost-thumb-gen/sandbox.html';
const SANDBOX_FILE = path.join(ROOT_DIR, 'site/sandbox.html');

async function generateThumbnails() {
    console.log('Starting thumbnail generation...');
    
    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
        console.log(`Created directory: ${THUMBNAILS_DIR}`);
    }

    if (!fs.existsSync(POSTS_INDEX)) {
        console.error(`Index file not found: ${POSTS_INDEX}`);
        return;
    }

    const posts = JSON.parse(fs.readFileSync(POSTS_INDEX, 'utf-8'));
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Setup request interception to serve sandbox.html from a fake HTTP origin
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url() === SANDBOX_URL) {
                request.respond({
                    status: 200,
                    contentType: 'text/html',
                    body: fs.readFileSync(SANDBOX_FILE)
                });
            } else {
                request.continue();
            }
        });

        // High quality thumbnails matching the detail view aspect ratio (800x410)
        await page.setViewport({ width: 800, height: 410, deviceScaleFactor: 2 });

        const force = process.argv.includes('--force');

        for (const post of posts) {
            const thumbPath = path.join(THUMBNAILS_DIR, `${post.post_id}.webp`);
            
            // Incremental generation: Skip if already exists (unless --force is used)
            if (fs.existsSync(thumbPath) && !force) {
                // console.log(`Skipping ${post.post_id} (already exists)`);
                continue;
            }

            console.log(`Generating thumbnail for ${post.post_id}: ${post.title}`);
            
            const postDataPath = path.join(ROOT_DIR, 'site', post.path);
            if (!fs.existsSync(postDataPath)) {
                console.warn(`Post data not found: ${postDataPath}`);
                continue;
            }
            const postData = JSON.parse(fs.readFileSync(postDataPath, 'utf-8'));

            await page.goto(SANDBOX_URL);

            // Disable ECharts animations for consistent screenshot timing
            await page.evaluate(() => {
                if (window.echarts) {
                    const originalInit = window.echarts.init;
                    window.echarts.init = function() {
                        const chart = originalInit.apply(this, arguments);
                        const originalSetOption = chart.setOption;
                        chart.setOption = function(option) {
                            if (option && typeof option === 'object' && !Array.isArray(option)) {
                                option.animation = false;
                            }
                            return originalSetOption.apply(this, arguments);
                        };
                        return chart;
                    };
                }
            });

            // Wait for rendering to complete in sandbox.html
            await page.evaluate((data) => {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Render timeout')), 10000);
                    
                    const onMessage = (event) => {
                        if (event.data.type === 'render_ok') {
                            window.removeEventListener('message', onMessage);
                            clearTimeout(timeout);
                            resolve();
                        } else if (event.data.type === 'render_error') {
                            window.removeEventListener('message', onMessage);
                            clearTimeout(timeout);
                            reject(new Error(event.data.error || 'Unknown render error'));
                        }
                    };

                    window.addEventListener('message', onMessage);

                    window.postMessage({
                        type: 'render',
                        request_id: 'thumb-gen',
                        channel_token: 'dummy',
                        post: data
                    }, '*');
                });
            }, postData);

            // Wait for any secondary animations or layout stabilities
            await new Promise(r => setTimeout(r, 1000));

            const chartElement = await page.$('#chart');
            if (chartElement) {
                await chartElement.screenshot({
                    path: thumbPath,
                    type: 'webp',
                    quality: 85
                });
            } else {
                console.warn(`Chart element #chart not found for ${post.post_id}`);
            }
        }
    } catch (err) {
        console.error('Fatal error during thumbnail generation:', err);
        throw err;
    } finally {
        await browser.close();
    }
}

generateThumbnails().then(() => {
    console.log('Thumbnail generation successfully complete.');
}).catch(err => {
    console.error('Thumbnail generation failed:', err);
    process.exit(1);
});
