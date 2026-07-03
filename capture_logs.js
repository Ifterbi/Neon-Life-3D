import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', exception => console.log(`[Browser Exception] ${exception}`));

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log(`Navigation error: ${e.message}`);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
