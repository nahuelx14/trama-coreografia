(() => {
  'use strict';
  const STORAGE_KEY = 'trama-coreografia-v1';
  const palette = ['#ff5b5b','#ff9f43','#f4cd3a','#5cc78b','#35a7a0','#4d8fe6','#6c63d9','#a45ed0','#ef6da8','#795548','#1f2937','#9ba2aa'];
  const defaultDancers = [
    ['d1','Malena','#ff5b5b'],['d2','Juli','#ff9f43'],['d3','Cata','#f4cd3a'],['d4','Lola','#5cc78b'],['d5','Paz','#35a7a0'],
    ['d6','Emi','#4d8fe6'],['d7','Mora','#6c63d9'],['d8','Sofi','#a45ed0'],['d9','Tizi','#ef6da8'],['d10','Vale','#795548']
  ].map(([id,name,color]) => ({id,name,color}));
  const positionsA = [[14,18],[35,18],[58,18],[79,18],[24,43],[47,43],[70,43],[14,72],[42,72],[74,72]];
  const positionsB = [[12,50],[22,37],[32,50],[42,37],[52,50],[62,37],[72,50],[82,37],[42,72],[62,72]];
  const positionsC = [[50,13],[36,28],[64,28],[24,46],[76,46],[15,68],[34,68],[50,80],[66,68],[85,68]];
  const toMap = values => Object.fromEntries(defaultDancers.map((d,i) => [d.id,{x:values[i][0],y:values[i][1]}]));
  const freshState = () => ({ routineName:'Nueva coreografía', rows:6, cols:9, frontSide:'right', musicName:'', dancers:defaultDancers, formations:[
    {id:uid(),name:'Entrada',cue:0,positions:toMap(positionsA)},
    {id:uid(),name:'Diagonal',cue:8,positions:toMap(positionsB)},
    {id:uid(),name:'Cierre',cue:16,positions:toMap(positionsC)}
  ], activeFormation:0, speed:950 });
  let state = loadState();
  let editingDancerId = null;
  let selectedColor = palette[0];
  let playback = {playing:false, frame:null, from:0, to:1, started:0, pausedAt:0};
  let audioReady = false;
  let audioUrl = null;
  let audioFrame = null;

  const $ = id => document.getElementById(id);
  const els = {
    stage:$('stage'), grid:$('grid'), dancerLayer:$('dancerLayer'), dancerList:$('dancerList'), formationsList:$('formationsList'),
    formationTitle:$('formationTitle'), dancerCount:$('dancerCount'), formationCount:$('formationCount'), rows:$('rowsInput'), cols:$('colsInput'),
    frontSide:$('frontSide'), stageFrame:$('stageFrame'), frontArrow:$('frontArrow'),
    audio:$('audio'), audioInput:$('audioInput'), audioPlay:$('audioPlayBtn'), audioSeek:$('audioSeek'), audioCurrent:$('audioCurrent'), audioDuration:$('audioDuration'), musicFileName:$('musicFileName'), musicPrivacy:$('musicPrivacy'), fileButtonText:$('fileButtonText'),
    routineName:$('routineName'), dialog:$('dancerDialog'), dancerForm:$('dancerForm'), dancerName:$('dancerName'), dialogTitle:$('dialogTitle'),
    colorOptions:$('colorOptions'), customColor:$('customColor'), toast:$('toast'), playBtn:$('playBtn'), playIcon:$('playIcon'),
    playStatus:$('playStatus'), playDetail:$('playDetail'), progressFill:$('progressFill'), progressCurrent:$('progressCurrent'), progressNext:$('progressNext'), speed:$('speedSelect')
  };

  function uid(){ return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
  function initials(name){ return name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(); }
  function loadState(){
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.formations?.length && saved?.dancers) return saved; } catch(e) {}
    return freshState();
  }
  function saveState(message){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if(message) showToast(message);
  }
  function showToast(message){ els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>els.toast.classList.remove('show'),1900); }
  function currentFormation(){ return state.formations[state.activeFormation]; }
  function ensurePositions(formation){
    state.dancers.forEach((d,i)=>{ if(!formation.positions[d.id]) formation.positions[d.id] = {x:20+(i%5)*15,y:30+Math.floor(i/5)*25}; });
  }
  function renderAll(){
    state.activeFormation = clamp(state.activeFormation,0,state.formations.length-1);
    state.formations.forEach((formation,i)=>{ ensurePositions(formation); if(!Number.isFinite(formation.cue)) formation.cue=i*8; });
    els.routineName.value = state.routineName;
    state.frontSide = ['top','bottom','left','right'].includes(state.frontSide) ? state.frontSide : 'right';
    els.rows.value = state.rows; els.cols.value = state.cols; els.speed.value = String(state.speed || 950); els.frontSide.value = state.frontSide;
    renderGrid(); renderFront(); renderDancers(); renderDancerList(); renderFormations(); renderMusicStatus(); updatePlaybackLabels();
  }
  function renderGrid(){ els.grid.style.backgroundSize = `calc(100% / ${state.cols}) calc(100% / ${state.rows})`; }
  function renderFront(){
    els.stageFrame.classList.remove('front-top','front-bottom','front-left','front-right');
    els.stageFrame.classList.add(`front-${state.frontSide}`);
    els.frontArrow.textContent = ({top:'↑',bottom:'↓',left:'←',right:'→'})[state.frontSide];
    els.stageFrame.querySelector('.stage-front').setAttribute('aria-label',`Frente del escenario: ${({top:'arriba',bottom:'abajo',left:'izquierda',right:'derecha'})[state.frontSide]}`);
  }
  function formatTime(seconds){ const safe=Math.max(0,Number(seconds)||0); const m=Math.floor(safe/60); const s=Math.floor(safe%60); return `${m}:${String(s).padStart(2,'0')}`; }
  function parseTime(value){
    const text=String(value).trim().replace(',','.'); if(!text) return NaN;
    if(text.includes(':')){ const parts=text.split(':').map(Number); if(parts.some(n=>!Number.isFinite(n))||parts.length>2) return NaN; return Math.max(0,parts[0]*60+parts[1]); }
    const seconds=Number(text); return Number.isFinite(seconds)?Math.max(0,seconds):NaN;
  }
  function renderMusicStatus(){
    if(audioReady) return;
    els.musicFileName.textContent=state.musicName?`Volvé a seleccionar: ${state.musicName}`:'Sumá la canción de la rutina';
    els.musicPrivacy.textContent=state.musicName?'Los tiempos están guardados. El archivo de audio no se conserva por privacidad.':'El audio queda en tu dispositivo; al reabrir tendrás que seleccionarlo otra vez.';
    els.fileButtonText.textContent=state.musicName?'Volver a elegir':'Elegir MP3';
  }
  function renderDancers(displayPositions){
    const positions = displayPositions || currentFormation().positions;
    els.dancerLayer.innerHTML = '';
    state.dancers.forEach(dancer => {
      const pos = positions[dancer.id] || {x:50,y:50};
      const node = document.createElement('button'); node.type='button'; node.className='dancer-node'; node.dataset.id=dancer.id;
      node.style.setProperty('--x',pos.x); node.style.setProperty('--y',pos.y); node.style.setProperty('--color',dancer.color);
      node.setAttribute('aria-label',`${dancer.name}. Posición ${Math.round(pos.x)}, ${Math.round(pos.y)}. Arrastrar para mover.`);
      node.innerHTML = `<span class="node-dot">${escapeHtml(initials(dancer.name))}</span><span class="node-label">${escapeHtml(dancer.name)}</span>`;
      node.addEventListener('pointerdown', startDrag);
      node.addEventListener('keydown', keyboardMove);
      els.dancerLayer.appendChild(node);
    });
  }
  function startDrag(event){
    if(playback.playing) stopPlayback(false);
    event.preventDefault(); const node=event.currentTarget; node.setPointerCapture(event.pointerId); node.classList.add('dragging');
    const move = e => {
      const rect=els.stage.getBoundingClientRect(); const x=clamp((e.clientX-rect.left)/rect.width*100,3,97); const y=clamp((e.clientY-rect.top)/rect.height*100,5,95);
      node.style.setProperty('--x',x); node.style.setProperty('--y',y); currentFormation().positions[node.dataset.id]={x,y};
    };
    const up = () => { node.classList.remove('dragging'); node.removeEventListener('pointermove',move); node.removeEventListener('pointerup',up); node.removeEventListener('pointercancel',up); saveState(); renderFormations(); };
    node.addEventListener('pointermove',move); node.addEventListener('pointerup',up); node.addEventListener('pointercancel',up);
  }
  function keyboardMove(event){
    const vectors={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}; if(!vectors[event.key]) return;
    event.preventDefault(); const step=event.shiftKey?5:1; const p=currentFormation().positions[event.currentTarget.dataset.id];
    p.x=clamp(p.x+vectors[event.key][0]*step,3,97); p.y=clamp(p.y+vectors[event.key][1]*step,5,95); saveState(); renderDancers(); renderFormations();
  }
  function renderDancerList(){
    els.dancerCount.textContent=state.dancers.length; els.dancerList.innerHTML='';
    state.dancers.forEach(d=>{
      const row=document.createElement('div'); row.className='dancer-row';
      row.innerHTML=`<span class="dancer-swatch" style="background:${d.color}"></span><strong>${escapeHtml(d.name)}</strong><span class="row-actions"><button class="mini-button edit" aria-label="Editar a ${escapeHtml(d.name)}">✎</button><button class="mini-button danger delete" aria-label="Eliminar a ${escapeHtml(d.name)}">×</button></span>`;
      row.querySelector('.edit').onclick=()=>openDancerDialog(d.id); row.querySelector('.delete').onclick=()=>deleteDancer(d.id); els.dancerList.appendChild(row);
    });
  }
  function miniPreview(formation){
    return state.dancers.map(d=>{ const p=formation.positions[d.id]; return p?`<i class="mini-dot" style="left:${p.x}%;top:${p.y}%;background:${d.color}"></i>`:''; }).join('');
  }
  function renderFormations(){
    els.formationCount.textContent=state.formations.length; els.formationsList.innerHTML='';
    state.formations.forEach((f,i)=>{
      const card=document.createElement('div'); card.className='formation-card'+(i===state.activeFormation?' active':''); card.tabIndex=0;
      card.innerHTML=`<span class="formation-number">${String(i+1).padStart(2,'0')}</span><div class="formation-preview">${miniPreview(f)}</div><div class="formation-meta"><strong>${escapeHtml(f.name)}</strong><small>${state.dancers.length} bailarines</small></div><div class="formation-cue"><label><span class="sr-only">Tiempo de entrada de ${escapeHtml(f.name)}</span><input class="cue-input" value="${formatTime(f.cue)}" inputmode="decimal" aria-label="Tiempo de entrada de ${escapeHtml(f.name)}"></label><button class="mini-button mark" ${audioReady?'':'disabled'} aria-label="Marcar ${escapeHtml(f.name)} en el momento actual">◎ Marcar ahora</button></div><div class="formation-actions"><button class="mini-button up" aria-label="Mover arriba">↑</button><button class="mini-button down" aria-label="Mover abajo">↓</button><button class="mini-button rename" aria-label="Renombrar">✎</button><button class="mini-button danger delete" aria-label="Eliminar">×</button></div>`;
      const select=()=>{ if(playback.playing) stopPlayback(false); state.activeFormation=i; saveState(); renderAll(); };
      card.onclick=e=>{if(!e.target.closest('button')) select();}; card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};
      card.querySelector('.up').onclick=()=>moveFormation(i,-1); card.querySelector('.down').onclick=()=>moveFormation(i,1); card.querySelector('.rename').onclick=()=>renameFormation(i); card.querySelector('.delete').onclick=()=>deleteFormation(i);
      card.querySelector('.cue-input').onchange=e=>setCue(i,parseTime(e.target.value));
      card.querySelector('.mark').onclick=()=>setCue(i,els.audio.currentTime);
      els.formationsList.appendChild(card);
    });
    els.formationTitle.textContent=`${currentFormation().name} · ${String(state.activeFormation+1).padStart(2,'0')}`;
  }
  function openDancerDialog(id=null){
    editingDancerId=id; const dancer=state.dancers.find(d=>d.id===id); selectedColor=dancer?.color || palette[state.dancers.length%palette.length];
    els.dialogTitle.textContent=dancer?'Editar bailarín':'Agregar bailarín'; els.dancerName.value=dancer?.name||''; els.customColor.value=selectedColor; renderColors(); els.dialog.showModal(); setTimeout(()=>els.dancerName.focus(),30);
  }
  function renderColors(){
    els.colorOptions.innerHTML=''; palette.forEach(color=>{ const b=document.createElement('button'); b.type='button'; b.className='color-chip'+(color===selectedColor?' selected':''); b.style.background=color; b.setAttribute('aria-label',`Elegir color ${color}`); b.onclick=()=>{selectedColor=color;els.customColor.value=color;renderColors();}; els.colorOptions.appendChild(b); });
  }
  function submitDancer(event){
    event.preventDefault(); const name=els.dancerName.value.trim(); if(!name){els.dancerName.focus();return;}
    if(editingDancerId){ const d=state.dancers.find(x=>x.id===editingDancerId); d.name=name; d.color=selectedColor; showToast('Bailarín actualizado'); }
    else { const id=uid(); state.dancers.push({id,name,color:selectedColor}); state.formations.forEach((f,i)=>{f.positions[id]={x:18+(state.dancers.length*11+i*5)%65,y:24+(state.dancers.length*17+i*7)%55};}); showToast('Bailarín agregado'); }
    saveState(); els.dialog.close(); renderAll();
  }
  function deleteDancer(id){
    const d=state.dancers.find(x=>x.id===id); if(!d || !confirm(`¿Eliminar a ${d.name} de todas las formaciones?`)) return;
    state.dancers=state.dancers.filter(x=>x.id!==id); state.formations.forEach(f=>delete f.positions[id]); saveState('Bailarín eliminado'); renderAll();
  }
  function duplicateFormation(){
    const source=currentFormation(); const next=state.formations[state.activeFormation+1]; const cue=next?(source.cue+next.cue)/2:source.cue+4; const copy={id:uid(),name:`${source.name} (copia)`,cue,positions:JSON.parse(JSON.stringify(source.positions))};
    state.formations.splice(state.activeFormation+1,0,copy); state.activeFormation++; saveState('Formación duplicada'); renderAll();
  }
  function newFormation(){
    const positions={}; state.dancers.forEach((d,i)=>positions[d.id]={x:15+(i%5)*17,y:30+Math.floor(i/5)*28});
    const last=state.formations[state.formations.length-1]; state.formations.push({id:uid(),name:`Formación ${state.formations.length+1}`,cue:(last?.cue||0)+8,positions}); state.activeFormation=state.formations.length-1; saveState('Nueva formación creada'); renderAll();
  }
  function moveFormation(i,delta){ const ni=i+delta;if(ni<0||ni>=state.formations.length)return;[state.formations[i],state.formations[ni]]=[state.formations[ni],state.formations[i]];state.activeFormation=ni;normalizeCues();saveState('Secuencia reordenada');renderAll(); }
  function renameFormation(i){ const name=prompt('Nombre de la formación:',state.formations[i].name);if(name?.trim()){state.formations[i].name=name.trim().slice(0,40);saveState();renderAll();} }
  function deleteFormation(i){ if(state.formations.length===1){showToast('La rutina necesita al menos una formación');return;}if(!confirm(`¿Eliminar “${state.formations[i].name}”?`))return;state.formations.splice(i,1);state.activeFormation=clamp(state.activeFormation-(i<=state.activeFormation?1:0),0,state.formations.length-1);saveState('Formación eliminada');renderAll(); }
  function normalizeCues(){
    const duration=audioReady&&Number.isFinite(els.audio.duration)?els.audio.duration:Infinity; const gap=Number.isFinite(duration)?Math.min(.1,duration/Math.max(2,state.formations.length)):0.1;
    state.formations.forEach((f,i)=>{f.cue=Math.max(0,Number(f.cue)||0);if(i)f.cue=Math.max(f.cue,state.formations[i-1].cue+gap);});
    if(Number.isFinite(duration)&&state.formations.at(-1).cue>duration){state.formations.at(-1).cue=duration;for(let i=state.formations.length-2;i>=0;i--)state.formations[i].cue=Math.max(0,Math.min(state.formations[i].cue,state.formations[i+1].cue-gap));}
  }
  function setCue(index,seconds){
    if(!Number.isFinite(seconds)){showToast('Usá un tiempo como 0:24 o 24');renderFormations();return;}
    const previous=index?state.formations[index-1].cue+0.1:0; const next=index<state.formations.length-1?state.formations[index+1].cue-0.1:Infinity; const duration=audioReady&&Number.isFinite(els.audio.duration)?els.audio.duration:Infinity;
    const value=clamp(seconds,previous,Math.min(next,duration)); state.formations[index].cue=Math.round(value*10)/10;
    if(Math.abs(value-seconds)>.05)showToast('Ajustamos la marca para respetar el orden');else showToast(`Marca guardada en ${formatTime(value)}`);
    saveState();renderFormations();if(audioReady)syncFromAudio(els.audio.currentTime||0);
  }
  function updatePlaybackLabels(){
    const total=state.formations.length; const next=(state.activeFormation+1)%total; els.playDetail.textContent=audioReady?`${total} formaciones · sincronizadas con la canción`:`${total} ${total===1?'formación':'formaciones'} · ciclo continuo`; els.progressCurrent.textContent=String(state.activeFormation+1).padStart(2,'0'); els.progressNext.textContent=String(next+1).padStart(2,'0');
  }
  function togglePlayback(){ if(audioReady){toggleAudio();return;} if(state.formations.length<2){showToast('Agregá otra formación para animar');return;} playback.playing?pausePlayback():startPlayback(); }
  function startPlayback(){
    playback.playing=true;
    if(playback.pausedAt>0){ playback.started=performance.now()-playback.pausedAt; playback.pausedAt=0; }
    else { playback.from=state.activeFormation; playback.to=(playback.from+1)%state.formations.length; playback.started=performance.now(); }
    els.playIcon.textContent='Ⅱ';els.playStatus.textContent='Reproduciendo secuencia';playback.frame=requestAnimationFrame(tickPlayback);
  }
  function pausePlayback(){ playback.playing=false; playback.pausedAt=Math.max(0,performance.now()-playback.started); cancelAnimationFrame(playback.frame); els.playIcon.textContent='▶';els.playStatus.textContent='Secuencia en pausa'; }
  function stopPlayback(render=true){ playback.playing=false;playback.pausedAt=0;cancelAnimationFrame(playback.frame);els.playIcon.textContent='▶';els.playStatus.textContent='Lista para ensayar';els.progressFill.style.width='0%';if(render)renderDancers(); }
  function tickPlayback(now){
    if(!playback.playing)return; const duration=Number(state.speed||950); const raw=(now-playback.started)/duration; const p=clamp(raw,0,1); const eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    const a=state.formations[playback.from].positions,b=state.formations[playback.to].positions,inter={};
    state.dancers.forEach(d=>{const pa=a[d.id]||{x:50,y:50},pb=b[d.id]||pa;inter[d.id]={x:pa.x+(pb.x-pa.x)*eased,y:pa.y+(pb.y-pa.y)*eased};});
    renderDancers(inter); els.progressFill.style.width=`${p*100}%`; els.progressCurrent.textContent=String(playback.from+1).padStart(2,'0');els.progressNext.textContent=String(playback.to+1).padStart(2,'0');
    if(p>=1){state.activeFormation=playback.to;playback.from=playback.to;playback.to=(playback.to+1)%state.formations.length;playback.started=now+260;playback.pausedAt=0;renderFormations();} playback.frame=requestAnimationFrame(tickPlayback);
  }
  function handleAudioFile(event){
    const file=event.target.files?.[0]; if(!file)return;
    if(!(file.type.startsWith('audio/')||file.name.toLowerCase().endsWith('.mp3'))){showToast('Elegí un archivo MP3 válido');event.target.value='';return;}
    if(audioUrl)URL.revokeObjectURL(audioUrl); stopPlayback(false); audioUrl=URL.createObjectURL(file); audioReady=true; state.musicName=file.name; saveState();
    els.audio.src=audioUrl; els.audio.load(); els.musicFileName.textContent=file.name; els.musicPrivacy.textContent='Reproducción privada desde este dispositivo. Las marcas se guardan; el audio no.'; els.fileButtonText.textContent='Cambiar MP3'; els.audioPlay.disabled=false; els.audioSeek.disabled=false; renderFormations();updatePlaybackLabels();showToast('Música lista para sincronizar');
  }
  function toggleAudio(){ if(!audioReady)return; els.audio.paused?els.audio.play().catch(()=>showToast('No pudimos reproducir este archivo')):els.audio.pause(); }
  function updateAudioTime(){
    els.audioCurrent.textContent=formatTime(els.audio.currentTime); els.audioDuration.textContent=formatTime(els.audio.duration); els.audioSeek.max=Number.isFinite(els.audio.duration)?els.audio.duration:100; els.audioSeek.value=els.audio.currentTime||0;
  }
  function syncFromAudio(time){
    if(!state.formations.length)return; let index=0; for(let i=0;i<state.formations.length;i++){if(time>=state.formations[i].cue)index=i;else break;}
    const next=Math.min(index+1,state.formations.length-1); const start=state.formations[index].cue; const end=state.formations[next].cue; const p=next===index||end<=start?0:clamp((time-start)/(end-start),0,1); const a=state.formations[index].positions,b=state.formations[next].positions,inter={};
    state.dancers.forEach(d=>{const pa=a[d.id]||{x:50,y:50},pb=b[d.id]||pa;const eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;inter[d.id]={x:pa.x+(pb.x-pa.x)*eased,y:pa.y+(pb.y-pa.y)*eased};});
    const changed=state.activeFormation!==index;state.activeFormation=index;renderDancers(inter);els.progressFill.style.width=`${p*100}%`;els.progressCurrent.textContent=String(index+1).padStart(2,'0');els.progressNext.textContent=String(next+1).padStart(2,'0');if(changed)renderFormations();
  }
  function tickAudio(){ if(els.audio.paused)return;updateAudioTime();syncFromAudio(els.audio.currentTime);audioFrame=requestAnimationFrame(tickAudio); }
  function escapeHtml(value){ const d=document.createElement('div');d.textContent=value;return d.innerHTML; }

  function fileSlug(value){
    const normalized=String(value||'trama').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return normalized.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,54)||'trama';
  }
  function downloadFile(filename,content,type){
    const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const link=document.createElement('a');
    link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function exportProject(){
    const project={format:'trama-project',version:1,exportedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))};
    downloadFile(`${fileSlug(state.routineName)}.trama.json`,JSON.stringify(project,null,2),'application/json;charset=utf-8');
    showToast('Proyecto guardado en Descargas');
  }
  function cleanText(value,fallback,max){ const text=String(value??'').trim().slice(0,max);return text||fallback; }
  function importedProject(value){
    const source=value?.format==='trama-project'?value.state:value;
    if(!source||!Array.isArray(source.dancers)||!Array.isArray(source.formations)||!source.formations.length)throw new Error('El archivo no contiene una rutina válida.');
    if(source.dancers.length>200||source.formations.length>500)throw new Error('El proyecto supera el máximo de 200 bailarines o 500 formaciones.');
    const usedIds=new Set(); const sourceDancers=source.dancers.filter(d=>d&&typeof d==='object');
    const dancers=sourceDancers.map((d,i)=>{
      let id=String(d.id||`d${i+1}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||`d${i+1}`;
      while(usedIds.has(id))id=`${id}-${i+1}`;usedIds.add(id);
      return {id,name:cleanText(d.name,`Bailarín ${i+1}`,24),color:/^#[0-9a-f]{6}$/i.test(d.color)?d.color:palette[i%palette.length]};
    });
    const formations=source.formations.filter(f=>f&&typeof f==='object').map((f,formationIndex)=>{
      const positions={}; dancers.forEach((d,dancerIndex)=>{
        const sourceId=String(sourceDancers[dancerIndex]?.id??''); const sourcePositions=f.positions&&typeof f.positions==='object'?f.positions:{};
        const raw=Object.prototype.hasOwnProperty.call(sourcePositions,sourceId)?sourcePositions[sourceId]:null;
        positions[d.id]={x:clamp(Number(raw?.x)||50,3,97),y:clamp(Number(raw?.y)||50,5,95)};
      });
      const cue=Number(f.cue); return {id:uid(),name:cleanText(f.name,`Formación ${formationIndex+1}`,40),cue:Number.isFinite(cue)?clamp(cue,0,86400):formationIndex*8,positions};
    });
    if(!formations.length)throw new Error('El proyecto necesita al menos una formación.');
    const rows=clamp(Math.round(Number(source.rows)||6),2,12); const cols=clamp(Math.round(Number(source.cols)||9),2,16);
    return {routineName:cleanText(source.routineName,'Nueva coreografía',60),rows,cols,frontSide:['top','bottom','left','right'].includes(source.frontSide)?source.frontSide:'right',musicName:cleanText(source.musicName,'',120),dancers,formations,activeFormation:clamp(Math.round(Number(source.activeFormation)||0),0,formations.length-1),speed:clamp(Number(source.speed)||950,250,5000)};
  }
  async function importProjectFile(event){
    const input=event.target; const file=input.files?.[0]; if(!file)return;
    try {
      if(file.size>5*1024*1024)throw new Error('El archivo es demasiado grande. El máximo es 5 MB.');
      const next=importedProject(JSON.parse(await file.text()));
      if(!confirm(`Abrir “${next.routineName}” reemplazará la rutina actual en este dispositivo. ¿Continuar?`))return;
      stopPlayback(false); if(audioUrl)URL.revokeObjectURL(audioUrl); audioUrl=null;audioReady=false;els.audio.pause();els.audio.removeAttribute('src');els.audio.load();els.audioInput.value='';
      state=next;saveState();renderAll();showToast('Proyecto abierto y guardado');
    } catch(error){ showToast(error instanceof Error?error.message:'No pudimos abrir este proyecto.'); }
    finally { input.value=''; }
  }
  function csvCell(value){ return `"${String(value??'').replace(/"/g,'""')}"`; }
  function exportCsv(){
    const frontLabels={top:'Arriba',bottom:'Abajo',left:'Izquierda',right:'Derecha'};
    const rows=[['Rutina','Formación','Orden','Tiempo','Bailarín','Color','X (%)','Y (%)','Frente','Filas','Columnas']];
    state.formations.forEach((formation,index)=>state.dancers.forEach(dancer=>{const position=formation.positions[dancer.id]||{x:50,y:50};rows.push([state.routineName,formation.name,index+1,formatTime(formation.cue),dancer.name,dancer.color,Number(position.x).toFixed(2),Number(position.y).toFixed(2),frontLabels[state.frontSide],state.rows,state.cols]);}));
    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');downloadFile(`${fileSlug(state.routineName)}-posiciones.csv`,csv,'text/csv;charset=utf-8');showToast('CSV guardado en Descargas');
  }
  function formationSvg(formation,index){
    const x=42,y=58,w=816,h=408; const vertical=Array.from({length:state.cols+1},(_,i)=>`<line x1="${x+i*w/state.cols}" y1="${y}" x2="${x+i*w/state.cols}" y2="${y+h}"/>`).join('');
    const horizontal=Array.from({length:state.rows+1},(_,i)=>`<line x1="${x}" y1="${y+i*h/state.rows}" x2="${x+w}" y2="${y+i*h/state.rows}"/>`).join('');
    const dots=state.dancers.map(dancer=>{const position=formation.positions[dancer.id]||{x:50,y:50};const cx=x+clamp(Number(position.x)||50,3,97)/100*w;const cy=y+clamp(Number(position.y)||50,5,95)/100*h;return `<g><circle cx="${cx}" cy="${cy}" r="16" fill="${dancer.color}" stroke="#fff" stroke-width="3"/><text class="initial" x="${cx}" y="${cy+4}">${escapeHtml(initials(dancer.name))}</text><text class="name" x="${cx}" y="${cy+31}">${escapeHtml(dancer.name)}</text></g>`;}).join('');
    const frontLabels={top:'↑ ARRIBA',bottom:'↓ ABAJO',left:'← IZQUIERDA',right:'DERECHA →'};
    return `<article><header><div><span>FORMACIÓN ${String(index+1).padStart(2,'0')}</span><h2>${escapeHtml(formation.name)}</h2></div><strong>${escapeHtml(formatTime(formation.cue))}</strong></header><svg viewBox="0 0 900 520" role="img" aria-label="${escapeHtml(formation.name)}"><rect class="stage-bg" x="${x}" y="${y}" width="${w}" height="${h}"/><g class="grid">${vertical}${horizontal}</g><line class="center" x1="450" y1="${y}" x2="450" y2="${y+h}"/><text class="front" x="450" y="500">FRENTE: ${frontLabels[state.frontSide]}</text>${dots}</svg></article>`;
  }
  function exportSheets(){
    const sheets=state.formations.map(formationSvg).join('');
    const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(state.routineName)} — Láminas</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eeeae3;color:#202a44;font-family:Arial,sans-serif}main{max-width:1120px;margin:0 auto;padding:24px}.title{margin:0 0 20px}.title small,header span{color:#d94747;font-size:11px;letter-spacing:.16em;font-weight:800}.title h1,header h2{font-family:Georgia,serif;margin:3px 0}article{background:#fffdf9;border:1px solid #d9d5cd;border-radius:14px;padding:18px;margin:0 0 22px;break-after:page;page-break-after:always}article:last-child{break-after:auto;page-break-after:auto}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}header h2{font-size:24px}header strong{background:#202a44;color:white;padding:8px 12px;border-radius:8px}svg{display:block;width:100%;height:auto}.stage-bg{fill:#fffefa;stroke:#202a44;stroke-width:3}.grid line{stroke:#d9d7d1;stroke-width:1}.center{stroke:#202a44;stroke-width:1;stroke-dasharray:6 6;opacity:.35}.initial{fill:#fff;text-anchor:middle;font-size:10px;font-weight:bold}.name{fill:#202a44;text-anchor:middle;font-size:10px;font-weight:bold}.front{fill:#d94747;text-anchor:middle;font-size:11px;font-weight:bold;letter-spacing:2px}@media print{body{background:#fff}main{max-width:none;padding:0}.title{margin-bottom:8mm}article{border:0;padding:0;margin:0}}</style></head><body><main><section class="title"><small>TRAMA · LÁMINAS DE COREOGRAFÍA</small><h1>${escapeHtml(state.routineName)}</h1><p>${state.dancers.length} bailarines · ${state.formations.length} formaciones · Abrí el menú de impresión para guardar este documento como PDF.</p></section>${sheets}</main></body></html>`;
    downloadFile(`${fileSlug(state.routineName)}-laminas.html`,html,'text/html;charset=utf-8');showToast('Láminas guardadas en Descargas');
  }

  $('addDancerBtn').onclick=$('addDancerSecondary').onclick=()=>openDancerDialog();
  $('duplicateBtn').onclick=$('duplicateTopBtn').onclick=duplicateFormation; $('newFormationBtn').onclick=newFormation;
  $('exportProjectBtn').onclick=exportProject;$('importProjectInput').onchange=importProjectFile;$('exportCsvBtn').onclick=exportCsv;$('exportSheetsBtn').onclick=exportSheets;
  $('closeDialog').onclick=$('cancelDialog').onclick=()=>els.dialog.close(); els.dancerForm.addEventListener('submit',submitDancer);
  els.customColor.oninput=e=>{selectedColor=e.target.value;renderColors();};
  els.routineName.oninput=e=>{state.routineName=e.target.value;saveState();};
  const gridChange=()=>{state.rows=clamp(Number(els.rows.value)||6,2,12);state.cols=clamp(Number(els.cols.value)||9,2,16);els.rows.value=state.rows;els.cols.value=state.cols;saveState('Cuadrícula actualizada');renderGrid();};
  els.rows.onchange=gridChange;els.cols.onchange=gridChange;els.playBtn.onclick=togglePlayback;els.speed.onchange=e=>{state.speed=Number(e.target.value);saveState();if(playback.playing){playback.started=performance.now();}};
  els.frontSide.onchange=e=>{state.frontSide=e.target.value;saveState('Frente del escenario actualizado');renderFront();};
  els.audioInput.onchange=handleAudioFile;els.audioPlay.onclick=toggleAudio;els.audioSeek.oninput=e=>{if(audioReady){els.audio.currentTime=Number(e.target.value);updateAudioTime();syncFromAudio(els.audio.currentTime);}};
  els.audio.onloadedmetadata=()=>{normalizeCues();saveState();updateAudioTime();renderFormations();};
  els.audio.onplay=()=>{playback.playing=false;cancelAnimationFrame(playback.frame);els.audioPlay.textContent='Ⅱ';els.playIcon.textContent='Ⅱ';els.playStatus.textContent='Sincronizando con la música';cancelAnimationFrame(audioFrame);audioFrame=requestAnimationFrame(tickAudio);};
  els.audio.onpause=()=>{els.audioPlay.textContent='▶';els.playIcon.textContent='▶';if(audioReady&&!els.audio.ended)els.playStatus.textContent='Música en pausa';cancelAnimationFrame(audioFrame);updateAudioTime();syncFromAudio(els.audio.currentTime);};
  els.audio.onended=()=>{els.playStatus.textContent='Fin de la canción';els.audioPlay.textContent='▶';els.playIcon.textContent='▶';};
  document.querySelectorAll('.mobile-tabs button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.mobile-tabs button').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.workspace > aside, .stage-workspace').forEach(p=>p.classList.toggle('mobile-active',p.classList.contains(btn.dataset.panel)));});
  document.querySelector('.stage-workspace').classList.add('mobile-active');
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playback.playing)pausePlayback();});
  renderAll();
})();
