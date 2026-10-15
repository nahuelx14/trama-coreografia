const path = require('path');
const { pathToFileURL } = require('url');

const playwrightModule = process.env.TRAMA_PLAYWRIGHT_MODULE;
if (!playwrightModule) throw new Error('Falta TRAMA_PLAYWRIGHT_MODULE.');
const { chromium } = require(playwrightModule);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TRAMA_BROWSER_EXECUTABLE || chromium.executablePath() });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const audioPath = 'user-1/coreo-1/audio-principal.mp3';
  const mockSupabase = `
    window.__cloudUpdates = [];
    window.supabase = { createClient() {
      const row = {
        id: 'coreo-1', name: 'Coreo con música', share_code: 'ABCDEF123456',
        audio_path: null, audio_name: 'tema-principal.mp3', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        data: {
          routineName: 'Coreo con música', rows: 6, cols: 9, frontSide: 'right', musicName: 'tema-principal.mp3', musicPath: '${audioPath}', speed: 950,
          dancers: [{ id: 'd1', name: 'Emi', color: '#4d8fe6' }],
          formations: [{ id: 'f1', name: 'Entrada', cue: 0, positions: { d1: { x: 50, y: 50 } } }], transitions: {}, activeFormation: 0
        }
      };
      const query = () => {
        const q = {
          mode: '', payload: null, select() { this.mode = 'select'; return this; },
          update(payload) { this.mode = 'update'; this.payload = payload; window.__cloudUpdates.push(payload); return this; },
          eq() { return this; },
          single() { return Promise.resolve({ data: row, error: null }); },
          order() { return Promise.resolve({ data: [row], error: null }); },
          then(resolve) { return Promise.resolve({ data: row, error: null }).then(resolve); }
        };
        return q;
      };
      return {
        auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1', email: 'emi@example.com' } } }, error: null }), onAuthStateChange() {} },
        from: () => query(),
        storage: { from: () => ({ createSignedUrl: async path => ({ data: { signedUrl: 'data:audio/mpeg;base64,SUQz' }, error: path === '${audioPath}' ? null : new Error('Ruta incorrecta') }) }) }
      };
    }};
  `;
  await page.route('https://unpkg.com/@supabase/supabase-js@2', route => route.fulfill({ contentType: 'application/javascript', body: mockSupabase }));
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'dist', 'index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('musicFileName')?.textContent === 'tema-principal.mp3');

  const restored = await page.evaluate(() => ({
    eyebrow: document.getElementById('musicEyebrow').textContent,
    privacy: document.getElementById('musicPrivacy').textContent,
    playEnabled: !document.getElementById('audioPlayBtn').disabled,
  }));
  if (!restored.eyebrow.includes('NUBE') || !restored.privacy.includes('Asociada') || !restored.playEnabled) throw new Error('La música vinculada no se recuperó al abrir la coreografía.');

  await page.waitForTimeout(150);
  await page.locator('#routineName').fill('Coreo con música editada');
  await page.waitForTimeout(1600);
  const updates = await page.evaluate(() => window.__cloudUpdates);
  const repaired = updates.find(update => update?.audio_path === audioPath && update?.data?.musicPath === audioPath);
  if (!repaired) {
    const diagnostic = await page.evaluate(() => ({ active: localStorage.getItem('trama-coreografia-cloud-active-v1'), save: document.getElementById('saveStateText').textContent, name: document.getElementById('routineName').value }));
    throw new Error(`El guardado no conservó la asociación redundante del MP3. Operaciones: ${JSON.stringify(updates)}. Estado: ${JSON.stringify(diagnostic)}`);
  }

  console.log(JSON.stringify({ ok: true, restored, repairedAudioPath: repaired.audio_path }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
