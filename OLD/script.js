const PRESETS = [
  { name:'Minimal', vars:{'--wall-bg':'#f0ece4','--bar-bg':'#ffffff','--bar-border':'#e5e2dc','--bar-text':'#1a1a1a','--btn-bg':'#1a1a1a','--btn-text':'#ffffff','--btn-radius':'6px','--polaroid-bg':'#ffffff','--polaroid-caption-color':'#555555','--note-text':'#1a1a1a','--pin-color':'#1a1a1a','--accent':'#1a1a1a'} },
  { name:'Dark',    vars:{'--wall-bg':'#0f0f0f','--bar-bg':'#1a1a1a','--bar-border':'#2a2a2a','--bar-text':'#efefef','--btn-bg':'#efefef','--btn-text':'#111111','--btn-radius':'6px','--polaroid-bg':'#1e1e1e','--polaroid-caption-color':'#888888','--note-text':'#111111','--pin-color':'#efefef','--accent':'#efefef'} },
  { name:'Rose',    vars:{'--wall-bg':'#fdf0f0','--bar-bg':'#fff5f5','--bar-border':'#fcdede','--bar-text':'#5c1a1a','--btn-bg':'#c0392b','--btn-text':'#ffffff','--btn-radius':'20px','--polaroid-bg':'#ffffff','--polaroid-caption-color':'#c0392b','--note-text':'#5c1a1a','--pin-color':'#c0392b','--accent':'#c0392b'} },
  { name:'Forest',  vars:{'--wall-bg':'#eef4ee','--bar-bg':'#f4faf4','--bar-border':'#c8e0c8','--bar-text':'#1a3a1a','--btn-bg':'#2d6a2d','--btn-text':'#ffffff','--btn-radius':'4px','--polaroid-bg':'#fcfff8','--polaroid-caption-color':'#2d6a2d','--note-text':'#1a3a1a','--pin-color':'#2d6a2d','--accent':'#2d6a2d'} },
  { name:'Slate',   vars:{'--wall-bg':'#f1f5f9','--bar-bg':'#ffffff','--bar-border':'#e2e8f0','--bar-text':'#0f172a','--btn-bg':'#3b82f6','--btn-text':'#ffffff','--btn-radius':'8px','--polaroid-bg':'#ffffff','--polaroid-caption-color':'#64748b','--note-text':'#0f172a','--pin-color':'#3b82f6','--accent':'#3b82f6'} },
  { name:'Cream',   vars:{'--wall-bg':'#faf6ee','--bar-bg':'#fffdf5','--bar-border':'#e8dfc8','--bar-text':'#3a2e1a','--btn-bg':'#8b6914','--btn-text':'#fff8e1','--btn-radius':'3px','--polaroid-bg':'#fffdf8','--polaroid-caption-color':'#8b6914','--note-text':'#3a2e1a','--pin-color':'#8b6914','--accent':'#8b6914'} },
];

const NOTE_COLORS = [
  {name:'yellow',bg:'#fef08a'},{name:'blue',bg:'#bae6fd'},
  {name:'green',bg:'#bbf7d0'},{name:'pink',bg:'#fbcfe8'},
  {name:'orange',bg:'#fed7aa'},{name:'white',bg:'#ffffff'},
];

let sbUrl = localStorage.getItem('sb_url')||'';
let sbKey = localStorage.getItem('sb_key')||'';
let items = (() => { try { return JSON.parse(localStorage.getItem('wall_items')||'[]'); } catch(e){return[];} })();
let selColor = NOTE_COLORS[0];
let curVars = {};

/* ═══ THEME ══════════════════════════════════════════════════════════════ */
function av(input) { // apply color var
  document.documentElement.style.setProperty(input.dataset.var, input.value);
  curVars[input.dataset.var] = input.value;
  refreshCss();
}
function avt(input) { // apply text var
  document.documentElement.style.setProperty(input.dataset.var, input.value);
  curVars[input.dataset.var] = input.value;
  refreshCss();
}
function applyPreset(p) {
  Object.entries(p.vars).forEach(([k,v]) => {
    document.documentElement.style.setProperty(k,v); curVars[k]=v;
  });
  syncInputs(); refreshCss();
}
function syncInputs() {
  document.querySelectorAll('[data-var]').forEach(el => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(el.dataset.var).trim();
    if (el.type==='color') { try { el.value=toHex(v); } catch(e){} }
    else el.value = v;
  });
}
function toHex(c) {
  if (c.startsWith('#')) return c.substring(0,7);
  const d=document.createElement('div'); d.style.color=c; document.body.appendChild(d);
  const s=getComputedStyle(d).color; document.body.removeChild(d);
  const m=s.match(/\d+/g); if(!m) return '#000000';
  return '#'+m.slice(0,3).map(x=>parseInt(x).toString(16).padStart(2,'0')).join('');
}
function refreshCss() {
  const lines=[':root {'];
  Object.entries(curVars).forEach(([k,v])=>lines.push('  '+k+': '+v+';'));
  lines.push('}');
  document.getElementById('cssBox').textContent=lines.join('\n');
}
function copyCss() {
  navigator.clipboard.writeText(document.getElementById('cssBox').textContent)
    .then(()=>toast('CSS copiado!')).catch(()=>toast('Erro ao copiar'));
}
function saveTheme() { localStorage.setItem('wall_theme',JSON.stringify(curVars)); toast('Tema salvo!'); }
function loadTheme() {
  const saved = localStorage.getItem('wall_theme');
  if (saved) {
    try { Object.entries(JSON.parse(saved)).forEach(([k,v])=>{document.documentElement.style.setProperty(k,v);curVars[k]=v;}); }
    catch(e) { applyPreset(PRESETS[0]); }
  } else { applyPreset(PRESETS[0]); }
  syncInputs(); refreshCss();
}
function toggleTheme() { document.getElementById('themePanel').classList.toggle('open'); }

function buildPresets() {
  const g=document.getElementById('presetGrid');
  PRESETS.forEach(p=>{
    const c=document.createElement('div'); c.className='preset-chip';
    c.innerHTML=`<div class="chip-swatch" style="background:${p.vars['--wall-bg']};border:1px solid rgba(0,0,0,0.07)"></div><span>${p.name}</span>`;
    c.onclick=()=>applyPreset(p); g.appendChild(c);
  });
}

/* ═══ SUPABASE ═══════════════════════════════════════════════════════════ */
const sbH = () => ({'apikey':sbKey,'Authorization':'Bearer '+sbKey,'Content-Type':'application/json','Prefer':'return=representation'});
async function sbInsert(row) {
  if(!sbUrl||!sbKey) return null;
  try { const r=await fetch(sbUrl+'/rest/v1/wall_items',{method:'POST',headers:sbH(),body:JSON.stringify(row)}); const d=await r.json(); return d[0]||null; } catch(e){return null;}
}
async function sbDelete(id) {
  if(!sbUrl||!sbKey) return;
  try { await fetch(sbUrl+'/rest/v1/wall_items?id=eq.'+id,{method:'DELETE',headers:sbH()}); } catch(e){}
}
async function sbPatch(id,patch) {
  if(!sbUrl||!sbKey) return;
  try { await fetch(sbUrl+'/rest/v1/wall_items?id=eq.'+id,{method:'PATCH',headers:sbH(),body:JSON.stringify(patch)}); } catch(e){}
}
async function sbLoad() {
  if(!sbUrl||!sbKey) return null;
  try { const r=await fetch(sbUrl+'/rest/v1/wall_items?order=created_at.asc',{headers:{'apikey':sbKey,'Authorization':'Bearer '+sbKey}}); return await r.json(); } catch(e){return null;}
}
async function sbUpload(file) {
  if(!sbUrl||!sbKey) return null;
  const ext=file.name.split('.').pop();
  const path=Date.now()+'_'+Math.random().toString(36).slice(2)+'.'+ext;
  try { const r=await fetch(sbUrl+'/storage/v1/object/wall-photos/'+path,{method:'POST',headers:{'apikey':sbKey,'Authorization':'Bearer '+sbKey,'Content-Type':file.type},body:file}); return r.ok?sbUrl+'/storage/v1/object/public/wall-photos/'+path:null; } catch(e){return null;}
}
function openSb() { document.getElementById('sbUrl').value=sbUrl; document.getElementById('sbKey').value=sbKey; document.getElementById('sbOverlay').classList.add('open'); }
function closeSb() { document.getElementById('sbOverlay').classList.remove('open'); }
async function saveSb() {
  sbUrl=document.getElementById('sbUrl').value.trim().replace(/\/$/,'');
  sbKey=document.getElementById('sbKey').value.trim();
  localStorage.setItem('sb_url',sbUrl); localStorage.setItem('sb_key',sbKey);
  closeSb(); updateSbBtn();
  if (sbUrl&&sbKey) {
    toast('Conectando...');
    const r=await sbLoad();
    if(r&&Array.isArray(r)){ items=r; saveLocal(); renderAll(); toast(r.length+' item(s) carregado(s)'); }
    else toast('Supabase configurado');
  }
}
function updateSbBtn() {
  const b=document.getElementById('btnSb');
  b.textContent=(sbUrl&&sbKey)?'✓ Supabase':'Supabase';
  b.classList.toggle('on',!!(sbUrl&&sbKey));
}

/* ═══ RENDER ═════════════════════════════════════════════════════════════ */
function renderAll() {
  document.querySelectorAll('.polaroid,.postit').forEach(e=>e.remove());
  items.forEach(it=>it.type==='photo'?renderPol(it):renderNote(it));
  document.getElementById('empty').style.display=items.length?'none':'block';
}

function renderPol(item) {
  const el=document.createElement('div'); el.className='polaroid'; el.dataset.id=item.id;
  el.style.cssText=`left:${item.x||80}px;top:${item.y||80}px;transform:rotate(${item.rotation||0}deg)`;
  el.innerHTML=`<div class="pin-wrap"><div class="pin-head"></div><div class="pin-shaft"></div></div>
    <div class="polaroid-inner">
      <img class="polaroid-img" src="${item.image_url||item.dataUrl}" draggable="false">
      <div class="polaroid-caption" contenteditable="true">${item.caption||''}</div>
    </div>
    <button class="del-btn" onclick="delItem('${item.id}',event)">×</button>`;
  el.querySelector('.polaroid-caption').addEventListener('blur',function(){
    const it=items.find(i=>i.id===item.id); if(it){it.caption=this.textContent.trim();saveLocal();sbPatch(item.id,{caption:it.caption});}
  });
  drag(el); document.getElementById('wall').appendChild(el);
}

function renderNote(item) {
  const nc=NOTE_COLORS.find(c=>c.name===item.color)||NOTE_COLORS[0];
  const el=document.createElement('div'); el.className='postit'; el.dataset.id=item.id;
  el.style.cssText=`left:${item.x||100}px;top:${item.y||100}px;transform:rotate(${item.rotation||0}deg);background:${nc.bg}`;
  el.innerHTML=`<div class="postit-pin"></div><div class="postit-lines"></div>
    <div class="postit-text" contenteditable="true">${item.note_text||''}</div>
    <button class="del-btn" onclick="delItem('${item.id}',event)">×</button>`;
  el.querySelector('.postit-text').addEventListener('blur',function(){
    const it=items.find(i=>i.id===item.id); if(it){it.note_text=this.innerHTML;saveLocal();sbPatch(item.id,{note_text:it.note_text});}
  });
  drag(el); document.getElementById('wall').appendChild(el);
}

/* ═══ DRAG ═══════════════════════════════════════════════════════════════ */
function drag(el) {
  let sx,sy,sl,st,moved;
  const onDown=(cx,cy)=>{
    sx=cx;sy=cy;sl=parseFloat(el.style.left);st=parseFloat(el.style.top);moved=false;
    el.classList.add('dragging'); el.style.zIndex=50;
  };
  const onMove=(cx,cy)=>{
    const dx=cx-sx,dy=cy-sy; if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
    el.style.left=(sl+dx)+'px'; el.style.top=(st+dy)+'px';
  };
  const onUp=()=>{
    el.classList.remove('dragging'); el.style.zIndex='';
    if(moved){const it=items.find(i=>i.id===el.dataset.id);if(it){it.x=parseFloat(el.style.left);it.y=parseFloat(el.style.top);saveLocal();sbPatch(it.id,{x:it.x,y:it.y});}}
  };
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('del-btn')||e.target.contentEditable==='true') return;
    e.preventDefault(); onDown(e.clientX,e.clientY);
    const mv=e=>onMove(e.clientX,e.clientY);
    const up=()=>{onUp();document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });
  el.addEventListener('touchstart',e=>{
    if(e.target.classList.contains('del-btn')||e.target.contentEditable==='true') return;
    const t=e.touches[0]; onDown(t.clientX,t.clientY);
    const mv=e=>{const t=e.touches[0];onMove(t.clientX,t.clientY);};
    const up=()=>{onUp();el.removeEventListener('touchmove',mv);el.removeEventListener('touchend',up);};
    el.addEventListener('touchmove',mv,{passive:true}); el.addEventListener('touchend',up);
  },{passive:true});
}

/* ═══ ADD PHOTO ══════════════════════════════════════════════════════════ */
document.getElementById('fileInput').addEventListener('change',async function(){
  const files=Array.from(this.files); if(!files.length)return; this.value='';
  const ww=document.getElementById('wall').clientWidth;
  for(const file of files){
    const dataUrl=await readFile(file);
    const id=crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random().toString(36).slice(2);
    const x=60+Math.random()*Math.max(200,ww-300),y=60+Math.random()*300,r=(Math.random()-.5)*10;
    const item={id,type:'photo',x,y,rotation:r,image_url:dataUrl,caption:'',created_at:new Date().toISOString()};
    if(sbUrl&&sbKey){const url=await sbUpload(file);if(url)item.image_url=url;const s=await sbInsert({id,type:'photo',x,y,rotation:r,image_url:item.image_url,caption:''});if(s)item.id=s.id;}
    items.push(item); renderPol(item); document.getElementById('empty').style.display='none';
  }
  saveLocal(); toast(files.length+' foto(s) adicionada(s)');
});
function readFile(f){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(f);});}

/* ═══ NOTE ═══════════════════════════════════════════════════════════════ */
function buildNoteColors(){
  const c=document.getElementById('ncRow');
  NOTE_COLORS.forEach((nc,i)=>{
    const d=document.createElement('div'); d.className='nc-dot'+(i===0?' sel':'');
    d.style.background=nc.bg;
    d.onclick=()=>{c.querySelectorAll('.nc-dot').forEach(x=>x.classList.remove('sel'));d.classList.add('sel');selColor=nc;document.getElementById('noteBox').style.background=nc.bg;};
    c.appendChild(d);
  });
}
function openNote(){document.getElementById('noteText').value='';document.getElementById('noteBox').style.background=selColor.bg;document.getElementById('noteOverlay').classList.add('open');setTimeout(()=>document.getElementById('noteText').focus(),80);}
function closeNote(){document.getElementById('noteOverlay').classList.remove('open');}
async function addNote(){
  const text=document.getElementById('noteText').value.trim(); closeNote(); if(!text)return;
  const ww=document.getElementById('wall').clientWidth;
  const id=crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random().toString(36).slice(2);
  const x=60+Math.random()*Math.max(100,ww-300),y=60+Math.random()*300,r=(Math.random()-.5)*8;
  const item={id,type:'note',x,y,rotation:r,note_text:text,color:selColor.name,created_at:new Date().toISOString()};
  if(sbUrl&&sbKey){const s=await sbInsert({id,type:'note',x,y,rotation:r,note_text:text,color:selColor.name});if(s)item.id=s.id;}
  items.push(item); renderNote(item); saveLocal();
  document.getElementById('empty').style.display='none'; toast('Post-it adicionado');
}

/* ═══ DELETE ═════════════════════════════════════════════════════════════ */
async function delItem(id,e){
  e.stopPropagation(); if(!confirm('Remover?'))return;
  items=items.filter(i=>i.id!==id);
  const el=document.querySelector('[data-id="'+id+'"]'); if(el)el.remove();
  saveLocal(); sbDelete(id);
  if(!items.length)document.getElementById('empty').style.display='block';
  toast('Removido');
}

/* ═══ UTILS ══════════════════════════════════════════════════════════════ */
function saveLocal(){try{localStorage.setItem('wall_items',JSON.stringify(items));}catch(e){}}
let _tt;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2500);}

/* ═══ CLOSE ON BG ════════════════════════════════════════════════════════ */
document.getElementById('sbOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('sbOverlay'))closeSb();});
document.getElementById('noteOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('noteOverlay'))closeNote();});

/* ═══ INIT ═══════════════════════════════════════════════════════════════ */
async function init(){
  buildPresets(); buildNoteColors(); loadTheme(); updateSbBtn();
  if(sbUrl&&sbKey){const r=await sbLoad();if(r&&Array.isArray(r)&&r.length){items=r;saveLocal();}}
  renderAll();
}
init();