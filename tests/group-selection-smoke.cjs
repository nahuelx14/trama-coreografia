const path = require('path');
const { pathToFileURL } = require('url');

const playwrightModule = process.env.TRAMA_PLAYWRIGHT_MODULE;
if (!playwrightModule) throw new Error('Falta TRAMA_PLAYWRIGHT_MODULE.');
const { chromium } = require(playwrightModule);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TRAMA_BROWSER_EXECUTABLE || chromium.executablePath() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const url = pathToFileURL(path.resolve(__dirname, '..', 'dist', 'index.html')).href;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const dancers = page.locator('.dancer-node');
  await dancers.nth(0).click();
  await dancers.nth(1).click({ modifiers: ['Control'] });
  if (await page.locator('.dancer-node.group-selected').count() !== 2) throw new Error('Ctrl + clic no seleccionó dos bailarines.');
  if (!(await page.locator('#selectionToolbar').isVisible())) throw new Error('No apareció la barra de selección.');

  const before = await page.evaluate(() => [...document.querySelectorAll('.dancer-node')].slice(0, 3).map(node => ({ id: node.dataset.id, x: Number(node.style.getPropertyValue('--x')), y: Number(node.style.getPropertyValue('--y')) })));
  const box = await dancers.nth(0).boundingBox();
  if (!box) throw new Error('No se pudo ubicar el bailarín seleccionado.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 30, { steps: 7 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    return saved.dancers.slice(0, 3).map(dancer => ({ id: dancer.id, ...saved.formations[0].positions[dancer.id] }));
  });
  const firstDelta = { x: after[0].x - before[0].x, y: after[0].y - before[0].y };
  const secondDelta = { x: after[1].x - before[1].x, y: after[1].y - before[1].y };
  if (Math.abs(firstDelta.x - secondDelta.x) > .05 || Math.abs(firstDelta.y - secondDelta.y) > .05) throw new Error('El grupo no conservó la separación al moverlo.');
  if (Math.abs(after[2].x - before[2].x) > .01 || Math.abs(after[2].y - before[2].y) > .01) throw new Error('Se movió un bailarín que no estaba seleccionado.');

  await page.locator('#toggleDancerDimBtn').click();
  const dimmed = await page.evaluate(() => JSON.parse(localStorage.getItem('trama-coreografia-v1')).formations[0].dimmedDancers);
  if (dimmed.length !== 2 || await page.locator('.dancer-node.dimmed').count() !== 2) throw new Error('El estado gris no se aplicó a la selección.');
  if (process.env.TRAMA_SCREENSHOT) await page.screenshot({ path: process.env.TRAMA_SCREENSHOT, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, toolbarWidth: document.getElementById('selectionToolbar').getBoundingClientRect().width }));
  if (mobile.scrollWidth > mobile.innerWidth || mobile.toolbarWidth > mobile.innerWidth) throw new Error('La selección múltiple desborda en formato celular.');
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.locator('.formation-card').nth(1).locator('.formation-meta').click();
  if (await page.locator('.dancer-node.dimmed').count()) throw new Error('El estado gris se filtró a otra formación.');
  await page.locator('.formation-card').first().locator('.formation-meta').click();
  if (await page.locator('.dancer-node.dimmed').count() !== 2) throw new Error('El estado gris no reapareció en su formación.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  if (await page.locator('.dancer-node.dimmed').count() !== 2) throw new Error('El estado gris no sobrevivió a la reapertura.');
  await page.locator('.dancer-node').nth(0).click();
  await page.locator('.dancer-node').nth(1).click({ modifiers: ['Control'] });
  if (!(await page.locator('#toggleDancerDimLabel').innerText()).includes('Restaurar')) throw new Error('No aparece la opción para restaurar el color.');
  await page.locator('#toggleDancerDimBtn').click();
  if (await page.locator('.dancer-node.dimmed').count()) throw new Error('No se restauró el color original.');
  if (errors.length) throw new Error(`Errores de navegador: ${errors.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, selected: 2, firstDelta, secondDelta, dimmedOnlyInFormation: true, persisted: true, restored: true, mobile }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
