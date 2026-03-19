import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent('<div style="width:100vw;height:100vh;background:#0b6f79;display:flex;align-items:center;justify-content:center;color:white;font-size:72px;font-family:sans-serif;font-weight:bold;">Hakoniwa Chart Catalog</div>');
  await page.screenshot({ path: 'public/ogp_dummy.png' });
  await browser.close();
})();
