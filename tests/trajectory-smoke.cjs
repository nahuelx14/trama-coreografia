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
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('supabase')) errors.push(message.text());
  });

  const url = pathToFileURL(path.resolve(__dirname, '..', 'dist', 'index.html')).href;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const badge = await page.locator('.lab-badge').innerText();
  if (!badge.includes('ETAPA 2')) throw new Error('No aparece la identificación de la etapa 2.');
  if (!(await page.locator('#trajectoryEditBtn').isVisible())) throw new Error('No aparece el editor de trayectorias.');

  await page.locator('#trajectoryEditBtn').click();
  const handle = page.locator('.trajectory-handle');
  await handle.waitFor({ state: 'visible' });
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error('No se pudo ubicar el control de la curva.');
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 95, handleBox.y + 70, { steps: 8 });
  await page.mouse.up();

  const afterDrag = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    return {
      transitions: saved?.transitions,
      resetEnabled: !document.getElementById('trajectoryResetBtn').disabled,
      curvedPath: document.querySelector('.trajectory-path.selected')?.classList.contains('custom') || false,
    };
  });
  if (!afterDrag.transitions || !Object.keys(afterDrag.transitions).length) throw new Error('La curva no se guardó.');
  if (!afterDrag.resetEnabled || !afterDrag.curvedPath) throw new Error('La interfaz no reconoció la curva guardada.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#trajectoryEditBtn').click();
  const persisted = await page.evaluate(() => ({
    resetEnabled: !document.getElementById('trajectoryResetBtn').disabled,
    curvedPath: document.querySelector('.trajectory-path.selected')?.classList.contains('custom') || false,
  }));
  if (!persisted.resetEnabled || !persisted.curvedPath) throw new Error('La curva no sobrevivió a la reapertura de la página.');

  await page.locator('#trajectoryPreviewBtn').click();
  await page.waitForTimeout(1400);
  const previewLabel = await page.locator('#trajectoryPreviewBtn').innerText();
  if (!previewLabel.includes('Probar')) throw new Error('La vista previa no terminó correctamente.');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cardWidth: document.getElementById('trajectoryCard').getBoundingClientRect().width,
  }));
  if (mobile.scrollWidth > mobile.innerWidth || mobile.cardWidth > mobile.innerWidth) throw new Error('El editor desborda en formato celular.');

  await page.locator('#trajectoryResetBtn').click();
  const resetDisabled = await page.locator('#trajectoryResetBtn').isDisabled();
  if (!resetDisabled) throw new Error('El botón Recta no limpió el recorrido.');
  if (errors.length) throw new Error(`Errores de navegador: ${errors.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, badge, afterDrag, persisted, mobile }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
