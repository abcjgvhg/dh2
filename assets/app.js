
// Minimal app.js for Pages project - robust and small
const ROOT = document.getElementById('app-root');

function showToast(message, opts = {}){
  const type = opts.type || 'info';
  const duration = typeof opts.duration === 'number' ? opts.duration : 2200;
  let container = document.getElementById('toast-container');
  if (!container){
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '12px';
    container.style.left = '0';
    container.style.right = '0';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.background = type==='error'? 'rgba(220,38,38,0.95)': (type==='success' ? 'rgba(34,197,94,0.95)' : 'rgba(20,24,40,0.96)');
  toast.style.color = '#fff';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '8px';
  toast.style.margin = '6px';
  toast.style.boxShadow = '0 8px 20px rgba(2,6,23,0.28)';
  container.appendChild(toast);
  requestAnimationFrame(()=> { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
  setTimeout(()=> { try{ container.removeChild(toast); }catch(e){} }, duration);
}

// simple fetch helpers
async function fetchState(){
  const r = await fetch('/api/v1/state');
  if (!r.ok) throw new Error('state fetch failed '+r.status);
  return await r.json();
}
async function saveStateToServer(st){
  const r = await fetch('/api/v1/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(st) });
  if (!r.ok){
    let j;
    try{ j = await r.json(); }catch(e){}
    throw new Error(j && j.msg ? j.msg : 'save failed '+r.status);
  }
  return true;
}
async function authCheck(){
  try{
    const r = await fetch('/api/v1/auth-check');
    if (!r.ok) return {authed:false};
    return await r.json();
  }catch(e){ return {authed:false}; }
}

// render UI
let STATE = null;

function createTopBar(){
  const div = document.createElement('div');
  div.style.display='flex'; div.style.alignItems='center'; div.style.justifyContent='space-between'; div.style.gap='8px'; div.style.margin='12px';
  const left = document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='12px';
  const logo = document.createElement('div'); logo.textContent='NH'; logo.style.width='40px'; logo.style.height='40px'; logo.style.display='flex'; logo.style.alignItems='center'; logo.style.justifyContent='center'; logo.style.background='#5b8cff'; logo.style.color='#fff'; logo.style.borderRadius='8px'; logo.style.fontWeight='700';
  const title = document.createElement('div'); title.innerHTML = '<div style="font-weight:600">'+(STATE.settings.title||'我的导航')+'</div><div style="font-size:12px;color:#6b7280">Cloudflare Pages · daohang</div>';
  left.appendChild(logo); left.appendChild(title);
  const right = document.createElement('div');
  const btnNew = document.createElement('button'); btnNew.textContent='新增分组'; btnNew.onclick = async ()=>{ if (!(await requireEditAuth())) return; const name = prompt('新分组名称','新分组'); if(!name) return; STATE.groups.push({ id:'g_'+Date.now(), name, items:[] }); render(); saveDebounced(); };
  const btnExport = document.createElement('button'); btnExport.textContent='导出（groups/sites）'; btnExport.onclick = exportData;
  const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='application/json'; fileInput.style.display='none';
  const btnImport = document.createElement('button'); btnImport.textContent='导入（groups/sites）'; btnImport.onclick = ()=> fileInput.click();
  fileInput.onchange = importHandler;
  const btnSave = document.createElement('button'); btnSave.textContent='保存'; btnSave.onclick = ()=> saveNow();
  right.appendChild(btnNew); right.appendChild(btnExport); right.appendChild(btnImport); right.appendChild(btnSave); right.appendChild(fileInput);
  div.appendChild(left); div.appendChild(right);
  return div;
}

function render(){
  ROOT.innerHTML='';
  if (!STATE){ ROOT.textContent='无数据'; return; }
  ROOT.appendChild(createTopBar());
  const container = document.createElement('div'); container.style.display='grid'; container.style.gridTemplateColumns='repeat(auto-fill,minmax(260px,1fr))'; container.style.gap='12px'; container.style.padding='12px';
  STATE.groups.forEach((g,gi)=>{
    const col = document.createElement('div'); col.style.border='1px solid rgba(0,0,0,0.06)'; col.style.borderRadius='10px'; col.style.padding='12px'; col.style.background='rgba(255,255,255,0.96)';
    const h = document.createElement('div'); h.style.display='flex'; h.style.alignItems='center';
    const title = document.createElement('div'); title.textContent = g.name; title.style.fontWeight='600'; title.style.flex='1'; title.title = g.name;
    const count = document.createElement('div'); count.textContent = '(' + (g.items?g.items.length:0) + ')'; count.style.color='#6b7280'; count.style.marginLeft='8px';
    h.appendChild(title); h.appendChild(count);
    const ctrl = document.createElement('div'); ctrl.style.display='flex'; ctrl.style.gap='6px';
    const up = document.createElement('button'); up.textContent='↑'; up.title='上移'; up.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveGroup(g.id,-1); };
    const down = document.createElement('button'); down.textContent='↓'; down.title='下移'; down.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveGroup(g.id,1); };
    const add = document.createElement('button'); add.textContent='+网站'; add.onclick = async ()=>{ if (!(await requireEditAuth())) return; const t=prompt('网站标题'); if(!t) return; const url=prompt('URL'); if(!url) return; g.items.push({ id:'i_'+Date.now(), title:t, url, desc:'' }); render(); saveDebounced(); };
    const edit = document.createElement('button'); edit.textContent='编辑'; edit.onclick = async ()=>{ if (!(await requireEditAuth())) return; const n=prompt('分组名称',g.name); if(n){ g.name=n; render(); saveDebounced(); } };
    const del = document.createElement('button'); del.textContent='删除'; del.onclick = async ()=>{ if (!(await requireEditAuth())) return; if(confirm('确认删除分组？')){ STATE.groups = STATE.groups.filter(x=>x.id!==g.id); render(); saveDebounced(); } };
    ctrl.appendChild(up); ctrl.appendChild(down); ctrl.appendChild(add); ctrl.appendChild(edit); ctrl.appendChild(del);
    h.appendChild(ctrl);
    col.appendChild(h);
    const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px'; list.style.marginTop='10px';
    (g.items||[]).forEach((it,ii)=>{
      const item = document.createElement('div'); item.style.display='flex'; item.style.alignItems='center'; item.style.justifyContent='space-between'; item.style.padding='8px'; item.style.borderRadius='8px'; item.style.background='rgba(255,255,255,0.88)'; item.style.border='1px solid rgba(0,0,0,0.03)';
      const meta = document.createElement('div'); meta.style.flex='1'; meta.innerHTML = '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escapeHtml(it.title)+'</div><div style="font-size:12px;color:#6b7280">'+escapeHtml(it.desc||it.url)+'</div>';
      meta.onclick = (ev)=>{ ev.preventDefault(); window.open(it.url,'_blank'); };
      const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='6px';
      const iu = document.createElement('button'); iu.textContent='↑'; iu.title='上移'; iu.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveItemWithinGroup(g.id,it.id,-1); };
      const idn = document.createElement('button'); idn.textContent='↓'; idn.title='下移'; idn.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveItemWithinGroup(g.id,it.id,1); };
      const il = document.createElement('button'); il.textContent='←'; il.title='移到上组'; il.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveItemToAdjacentGroup(g.id,it.id,-1); };
      const ir = document.createElement('button'); ir.textContent='→'; ir.title='移到下组'; ir.onclick = async ()=>{ if (!(await requireEditAuth())) return; moveItemToAdjacentGroup(g.id,it.id,1); };
      const editb = document.createElement('button'); editb.textContent='编辑'; editb.onclick = async ()=>{ if (!(await requireEditAuth())) return; const t=prompt('标题',it.title)||it.title; const u=prompt('URL',it.url)||it.url; const d=prompt('描述',it.desc)||it.desc; it.title=t; it.url=u; it.desc=d; render(); saveDebounced(); };
      const delb = document.createElement('button'); delb.textContent='删除'; delb.onclick = async ()=>{ if (!(await requireEditAuth())) return; if(confirm('确认删除该网站？')){ g.items = g.items.filter(x=>x.id!==it.id); render(); saveDebounced(); } };
      controls.appendChild(iu); controls.appendChild(idn); controls.appendChild(il); controls.appendChild(ir); controls.appendChild(editb); controls.appendChild(delb);
      item.appendChild(meta); item.appendChild(controls);
      list.appendChild(item);
    });
    col.appendChild(list);
    container.appendChild(col);
  });
  ROOT.appendChild(container);
}

function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// sorting functions
function moveGroup(gid, dir){
  const idx = STATE.groups.findIndex(g=>g.id===gid);
  if (idx===-1) return;
  const to = idx+dir;
  if (to<0 || to>=STATE.groups.length) return;
  const [g]=STATE.groups.splice(idx,1);
  STATE.groups.splice(to,0,g);
  render(); saveDebounced();
}
function moveItemWithinGroup(gid, id, dir){
  const g = STATE.groups.find(x=>x.id===gid); if(!g) return;
  const idx = g.items.findIndex(it=>it.id===id); if(idx===-1) return;
  const to = idx+dir; if(to<0||to>=g.items.length) return;
  const [it]=g.items.splice(idx,1); g.items.splice(to,0,it); render(); saveDebounced();
}
function moveItemToAdjacentGroup(gid, id, dir){
  const gIdx = STATE.groups.findIndex(g=>g.id===gid); if(gIdx===-1) return;
  const toGIdx = gIdx+dir; if(toGIdx<0||toGIdx>=STATE.groups.length) return;
  const g = STATE.groups[gIdx]; const toG = STATE.groups[toGIdx];
  const idx = g.items.findIndex(it=>it.id===id); if(idx===-1) return;
  const [it]=g.items.splice(idx,1); toG.items.push(it); render(); saveDebounced();
}

// import/export handlers
function exportData(){
  const groupsOut = STATE.groups.map((g, idx) => ({ id: g.id, name: g.name, order_num: idx }));
  const sitesOut = [];
  STATE.groups.forEach(g=>{ (g.items||[]).forEach((it, idx)=>{ sitesOut.push({ id: it.id, group_id: g.id, name: it.title||'', url: it.url||'', icon:'', description: it.desc||'', notes:'', order_num: idx }); }); });
  const payload = { groups: groupsOut, sites: sitesOut, version: "1.0", exportDate: (new Date()).toISOString() };
  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = '导航站备份_' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('已导出 groups & sites', {type:'success'});
}
async function importHandler(e){
  const f = e.target.files[0]; if(!f) return;
  if(!confirm('导入将覆盖当前 groups 与 sites，settings 不会被覆盖，继续？')){ e.target.value=''; return; }
  try{
    const txt = await f.text(); const j = JSON.parse(txt);
    if (j && j.groups && j.sites){
      const groupsArr = (j.groups||[]).slice().sort((a,b)=>(Number(a.order_num||0)-Number(b.order_num||0)));
      const newGroups = groupsArr.map(g=>({ id: g.id != null ? String(g.id) : ('g_'+Math.random().toString(36).slice(2,8)), name: g.name||g.title||'分组', items: [] }));
      const sitesArr = (j.sites||[]).slice().sort((a,b)=>(Number(a.order_num||0)-Number(b.order_num||0)));
      sitesArr.forEach(s=>{
        const gid = s.group_id != null ? String(s.group_id) : null;
        let group = newGroups.find(x=>String(x.id)===String(gid));
        if(!group){
          group = newGroups.find(x=>x.name==='其他');
          if(!group){ group = { id: 'g_other_'+Math.random().toString(36).slice(2,6), name:'其他', items:[] }; newGroups.push(group); }
        }
        group.items.push({ id: s.id != null ? String(s.id) : ('i_'+Date.now()+Math.random().toString(36).slice(2,6)), title: s.name||s.title||'', url: s.url||s.link||'', desc: s.description||s.notes||s.desc||'' });
      });
      STATE.groups = newGroups;
      render();
      showToast('导入成功，请点击保存持久化', {type:'success'});
    } else { throw new Error('格式不正确'); }
  }catch(err){ showToast('导入失败: '+err.message, {type:'error'}); }
  e.target.value='';
}

// save debounce
let saveTimer = null;
function saveDebounced(){ if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(()=>{ saveNow(); saveTimer=null; }, 900); }
async function saveNow(){
  try{
    await saveStateToServer(STATE);
    showToast('已保存', {type:'success'});
  }catch(err){ showToast('保存失败: '+err.message, {type:'error'}); }
}

// auth require
async function requireEditAuth(){ const r = await authCheck(); if (r && r.authed) return true; alert('需要登录才能编辑（请使用登录按钮）'); return false; }

// init
async function init(){
  try{
    const s = await fetchState();
    STATE = s;
    render();
  }catch(e){
    ROOT.textContent = '加载失败: '+e.message;
    console.error(e);
  }
}

init();

