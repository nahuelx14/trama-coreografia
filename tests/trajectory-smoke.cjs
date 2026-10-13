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
  if (!badge.includes('VERSIÓN FINAL')) throw new Error('No aparece la identificación de la versión final.');
  if (!(await page.locator('#trajectoryEditBtn').isVisible())) throw new Error('No aparece el editor de trayectorias.');
  if (!(await page.locator('#historyBtn').isVisible())) throw new Error('No aparece el acceso al historial.');
  if (!(await page.locator('#undoBtn').isDisabled())) throw new Error('Deshacer debería comenzar desactivado.');
  if (await page.locator('#musicDisclosure').getAttribute('open') !== null || await page.locator('#archiveDisclosure').getAttribute('open') !== null) throw new Error('Música y Archivo deberían comenzar plegados.');
  if (await page.locator('#audioInput').isVisible() || await page.locator('#exportProjectBtn').isVisible()) throw new Error('Las opciones plegadas siguen ocupando espacio.');
  await page.locator('#musicDisclosure > summary').click();
  if (!(await page.locator('.file-button').isVisible())) throw new Error('Música no desplegó sus opciones.');
  await page.locator('#musicDisclosure > summary').click();
  await page.locator('#archiveDisclosure > summary').click();
  if (!(await page.locator('#exportProjectBtn').isVisible())) throw new Error('Archivo no desplegó sus opciones.');
  await page.locator('#archiveDisclosure > summary').click();

  if (!(await page.locator('#playFromStartBtn').isVisible()) || !(await page.locator('#playFromSelectedBtn').isVisible())) throw new Error('No aparecen las dos opciones de inicio de la reproducción.');
  await page.locator('.formation-card').nth(2).locator('.formation-meta').click();
  const selectedStartLabel = await page.locator('#playSelectedLabel').innerText();
  if (!selectedStartLabel.includes('03') || !selectedStartLabel.includes('Cierre')) throw new Error('La opción seleccionada no refleja la formación activa.');
  await page.locator('#playFromSelectedBtn').click();
  await page.waitForTimeout(80);
  const fromSelected = await page.evaluate(() => ({
    activeNumber: document.querySelector('.formation-card.active .formation-number')?.textContent,
    current: document.getElementById('progressCurrent').textContent,
    status: document.getElementById('playStatus').textContent,
  }));
  if (fromSelected.activeNumber !== '03' || fromSelected.current !== '03' || !fromSelected.status.includes('Cierre')) throw new Error('La reproducción no comenzó desde la formación seleccionada.');
  await page.locator('#playBtn').click();
  await page.locator('#playFromStartBtn').click();
  await page.waitForTimeout(80);
  const fromStart = await page.evaluate(() => ({
    activeNumber: document.querySelector('.formation-card.active .formation-number')?.textContent,
    current: document.getElementById('progressCurrent').textContent,
    status: document.getElementById('playStatus').textContent,
  }));
  if (fromStart.activeNumber !== '01' || fromStart.current !== '01' || !fromStart.status.includes('inicio')) throw new Error('La reproducción no volvió al inicio.');
  await page.locator('#playBtn').click();
  await page.locator('.formation-card').first().locator('.formation-meta').click();

  const initialPosition = await page.evaluate(() => {
    const dancer = document.querySelector('.dancer-node');
    return { dancerId: dancer.dataset.id, x: Number(dancer.style.getPropertyValue('--x')), y: Number(dancer.style.getPropertyValue('--y')) };
  });
  const firstDancer = page.locator('.dancer-node').first();
  const dancerBox = await firstDancer.boundingBox();
  if (!dancerBox) throw new Error('No se pudo ubicar al primer bailarín.');
  await page.mouse.move(dancerBox.x + dancerBox.width / 2, dancerBox.y + dancerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dancerBox.x + dancerBox.width / 2 + 70, dancerBox.y + dancerBox.height / 2 + 35, { steps: 6 });
  await page.mouse.up();
  const movedPosition = await page.evaluate(dancerId => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    return saved.formations[saved.activeFormation].positions[dancerId];
  }, initialPosition.dancerId);
  if (Math.abs(movedPosition.x - initialPosition.x) < 1 && Math.abs(movedPosition.y - initialPosition.y) < 1) throw new Error('El movimiento del bailarín no se registró.');
  await page.locator('#undoBtn').click();
  const restoredPosition = await page.evaluate(dancerId => {
    const saved = JSON.parse(localStorage.getItem('trama-coreografia-v1'));
    return saved.formations[saved.activeFormation].positions[dancerId];
  }, initialPosition.dancerId);
  if (Math.abs(restoredPosition.x - initialPosition.x) > .01 || Math.abs(restoredPosition.y - initialPosition.y) > .01) throw new Error('El acceso rápido no deshizo el movimiento del bailarín.');

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
  if (await page.locator('#undoBtn').isDisabled()) throw new Error('Deshacer no se activó después del cambio.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#trajectoryEditBtn').click();
  const persisted = await page.evaluate(() => ({
    resetEnabled: !document.getElementById('trajectoryResetBtn').disabled,
    curvedPath: document.querySelector('.trajectory-path.selected')?.classList.contains('custom') || false,
  }));
  if (!persisted.resetEnabled || !persisted.curvedPath) throw new Error('La curva no sobrevivió a la reapertura de la página.');

  await page.locator('#undoBtn').click();
  const undone = await page.evaluate(() => ({
    transitions: JSON.parse(localStorage.getItem('trama-coreografia-v1'))?.transitions,
    resetDisabled: document.getElementById('trajectoryResetBtn').disabled,
    redoEnabled: !document.getElementById('redoBtn').disabled,
  }));
  if (Object.keys(undone.transitions || {}).length || !undone.resetDisabled || !undone.redoEnabled) throw new Error('Deshacer no restauró el estado anterior.');

  await page.locator('#historyBtn').click();
  if (!(await page.locator('#historyDrawer').evaluate(element => element.classList.contains('open')))) throw new Error('El panel de historial no se abrió.');
  if (await page.locator('.history-entry').count() < 2) throw new Error('El historial no muestra los cambios guardados.');

  await page.locator('#redoBtn').click();
  const redone = await page.evaluate(() => ({
    transitions: JSON.parse(localStorage.getItem('trama-coreografia-v1'))?.transitions,
    resetEnabled: !document.getElementById('trajectoryResetBtn').disabled,
  }));
  if (!Object.keys(redone.transitions || {}).length || !redone.resetEnabled) throw new Error('Rehacer no recuperó el cambio.');
  await page.locator('#closeHistoryBtn').click();

  await page.locator('#trajectoryPreviewBtn').click();
  await page.waitForTimeout(1400);
  const previewLabel = await page.locator('#trajectoryPreviewBtn').innerText();
  if (!previewLabel.includes('Probar')) throw new Error('La vista previa no terminó correctamente.');

  const baseCanvasWidth = await page.locator('#stageFrame').evaluate(element => element.getBoundingClientRect().width);
  await page.setViewportSize({ width: 1600, height: 900 });
  const zoom80CanvasWidth = await page.locator('#stageFrame').evaluate(element => element.getBoundingClientRect().width);
  await page.setViewportSize({ width: 1920, height: 900 });
  const zoom67CanvasWidth = await page.locator('#stageFrame').evaluate(element => element.getBoundingClientRect().width);
  await page.setViewportSize({ width: 1024, height: 900 });
  const zoom125CanvasWidth = await page.locator('#stageFrame').evaluate(element => element.getBoundingClientRect().width);
  const zoomLayout = {
    base: baseCanvasWidth,
    at80PercentPhysical: zoom80CanvasWidth * .8,
    at67PercentPhysical: zoom67CanvasWidth * (2 / 3),
    at125PercentPhysical: zoom125CanvasWidth * 1.25,
  };
  if (zoom80CanvasWidth > 781 || zoom67CanvasWidth > 781) throw new Error('La pizarra supera su nuevo ancho máximo.');
  if (zoomLayout.at80PercentPhysical > baseCanvasWidth + 2 || zoomLayout.at67PercentPhysical > baseCanvasWidth + 2 || zoomLayout.at125PercentPhysical > baseCanvasWidth + 8) throw new Error('La pizarra no acompaña correctamente el zoom del navegador.');

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

  console.log(JSON.stringify({ ok: true, badge, startModes: { selectedStartLabel, fromSelected, fromStart }, quickUndo: { initialPosition, movedPosition, restoredPosition }, afterDrag, persisted, undone, redone, zoomLayout, mobile }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
