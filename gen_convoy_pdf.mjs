// Generate a proper vector PDF of a convoy order from a mission payload.
// The payload is the JSON copied by the app's "PDF via Claude" button.
//
// Usage: node gen_convoy_pdf.mjs <payload.json> <out.pdf>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const [payloadPath, outPath = 'convoy-order.pdf'] = process.argv.slice(2);
if (!payloadPath) {
  console.error('usage: node gen_convoy_pdf.mjs <payload.json> [out.pdf]');
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
const state = {
  unitName: payload.unitName || '',
  fleet: payload.fleet || [],
  mission: payload.mission,
  archive: []
};

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'convoy_manager.html');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('file://' + appPath);
await page.evaluate(s => localStorage.setItem('convoy-manager-v1', JSON.stringify(s)), state);
await page.reload();
await page.click('[data-tab="report"]');
await page.waitForTimeout(400);
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', bottom: '12mm', left: '11mm', right: '11mm' }
});
await browser.close();
console.log('PDF written to', outPath);
