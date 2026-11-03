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
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const dancers = page.locator('.dancer-node');
  if (await dancers.count() < 3) throw new Error('No se cargaron los bailarines.');
  if (await dancers.first().evaluate(node => node.style.getPropertyValue('--facing-angle')) !== '90deg') throw new Error('La mirada inicial no apunta al frente del escenario.');

  await dancers.nth(0).click();
  await dancers.nth(1).click({ modifiers: ['Control'] });
  await page.locator('#facingSelect').selectOption('nw');
  const firstFormation = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    const ids = saved.dancers.slice(0, 3).map(dancer => dancer.id);
    return { facings: ids.map(id => saved.formations[0].facings[id]), activeFormation: saved.activeFormation };
  });
  if (firstFormation.facings.join(',') !== 'nw,nw,e') throw new Error(`La dirección grupal no se guardó correctamente: ${firstFormation.facings.join(',')}`);
  if (await page.locator('.dancer-node').nth(0).evaluate(node => node.style.getPropertyValue('--facing-angle')) !== '315deg') throw new Error('La flecha visible no cambió de dirección.');

  await page.locator('.formation-card').nth(1).locator('.formation-meta').click();
  await page.locator('.dancer-node').first().click();
  await page.locator('#facingSelect').selectOption('s');
  const secondFacing = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    return saved.formations[1].facings[saved.dancers[0].id];
  });
  if (secondFacing !== 's') throw new Error('La mirada no se guardó de forma independiente por formación.');

  await page.locator('.formation-card').first().locator('.formation-meta').click();
  if (await page.locator('.dancer-node').first().evaluate(node => node.style.getPropertyValue('--facing-angle')) !== '315deg') throw new Error('La primera formación perdió su dirección.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (await page.locator('.dancer-node').first().evaluate(node => node.style.getPropertyValue('--facing-angle')) !== '315deg') throw new Error('La dirección no sobrevivió a la reapertura.');

  if (process.env.TRAMA_SCREENSHOT) await page.screenshot({ path: process.env.TRAMA_SCREENSHOT, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.dancer-node').first().click();
  const mobile = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, toolbarWidth: document.getElementById('selectionToolbar').getBoundingClientRect().width }));
  if (mobile.scrollWidth > mobile.innerWidth || mobile.toolbarWidth > mobile.innerWidth) throw new Error('El selector de mirada desborda en formato celular.');
  if (errors.length) throw new Error(`Errores de navegador: ${errors.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, groupFacing: firstFormation.facings, independentByFormation: true, persisted: true, mobile }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
