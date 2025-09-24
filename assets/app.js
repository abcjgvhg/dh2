// app.js - simplified SPA frontend adapted from original worker single-file version
async function fetchState(){ const r = await fetch('/api/v1/state'); if (!r.ok) throw new Error('获取 state 失败: ' + r.status); return await r.json(); }
async function fetchMeta(){ const r = await fetch('/api/v1/meta'); if (!r.ok) return { authEnabled: 'false' }; return await r.json(); }
function escapeHtmlClient(s){ if (s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttrClient(s){ if (s==null) return ''; return String(s).replace(/"/g,'&quot;'); }
async function init(){
  try {
    const [state, meta] = await Promise.all([fetchState(), fetchMeta()]);
    const root = document.getElementById('app-root');
    // Build a minimal shell and then render grid (to keep file size reasonable we won't inline entire original HTML here)
    root.innerHTML = `
      <div class="fixed-bg-wrap" aria-hidden="true">
        <img id="fixed-bg-img" src="${escapeAttrClient(state.settings.background||'')}" alt="">
        <img id="fixed-bg-img-2" src="" alt="">
      </div>
      <div class="wrap">
        <header>
          <div class="brand">
            <div class="logo">NH</div>
            <div>
              <h1 id="siteTitle">${escapeHtmlClient(state.settings.title||'我的导航')}</h1>
              <div class="muted" id="siteSubtitle">个人导航 · Cloudflare Pages + KV (daohang)</div>
            </div>
          </div>
          <div class="controls">
            <div class="muted">编辑权限: ${meta.authEnabled === 'only' ? '需要密码' : '开放'}</div>
            <button id="btnNewGroup" class="btn">新增分组</button>
            <button id="btnSettings" class="btn ghost">网站设置</button>
            <button id="btnExport" class="btn ghost small">导出</button>
            <button id="btnImport" class="btn ghost small">导入</button>
            <button id="btnSave" class="btn">保存</button>
            <button id="btnToggleNoCache" class="btn ghost small"><span class="full-text">BG 不缓存：关</span><span class="short-text">BG:关</span></button>
          </div>
        </header>
        <main>
          <section class="grid" id="grid"></section>
          <footer><div>数据保存在 KV（命名空间：daohang）。</div></footer>
        </main>
      </div>
      <div class="floating"><button id="btnLogin" class="btn small">${meta.authEnabled === 'only' ? '登录(编辑)' : '登录'}</button></div>
      <div class="modal" id="modalLogin" aria-hidden="true"><div class="card"><h3>登录</h3><label>密码<input id="login_pwd" type="password"></label><div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="loginCancel" class="btn ghost small">取消</button><button id="loginSubmit" class="btn small">登录</button></div><div id="loginMsg" class="muted" style="margin-top:10px"></div></div></div>
    `;
    // render grid
    function renderGrid(){
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      state.groups.forEach(group=>{
        const col = document.createElement('div');
        col.className = 'col ' + (state.settings.liquidGlass ? 'liquid' : 'plain');
        col.dataset.gid = group.id;
        col.innerHTML = `<h3>${escapeHtmlClient(group.name)} <span style="font-size:12px" class="muted">(${group.items.length})</span></h3>
          <div class="muted meta">管理：<button class="small btn ghost" data-gid="${group.id}" data-action="add">+网站</button> <button class="small btn ghost" data-gid="${group.id}" data-action="edit">编辑</button> <button class="small btn ghost" data-gid="${group.id}" data-action="del">删除</button><span style="float:right"><button class="collapse-btn" data-gid="${group.id}" data-action="toggle">收起/展开</button></span></div>
          <div class="links" id="links_${group.id}">${group.items.map(it=>`<div class="link" data-gid="${group.id}" data-id="${it.id}" data-url="${escapeAttrClient(it.url)}"><div class="meta" style="flex:1"><a href="${escapeAttrClient(it.url)}" target="_blank" rel="noopener">${escapeHtmlClient(it.title)}</a><small>${escapeHtmlClient(it.desc||it.url)}</small></div><div style="display:flex;gap:6px"><button class="small btn ghost" data-gid="${group.id}" data-id="${it.id}" data-action="edit">编辑</button><button class="small btn ghost" data-gid="${group.id}" data-id="${it.id}" data-action="del">删除</button></div></div>`).join('')}</div>`;
        grid.appendChild(col);
      });
    }
    renderGrid();
    // attach basic handlers (save/login)
    document.getElementById('btnSave').addEventListener('click', async ()=>{
      const r = await fetch('/api/v1/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state) });
      if (r.ok) alert('已保存'); else { const j = await r.json().catch(()=>({})); alert('保存失败: '+(j.msg||r.statusText)); }
    });
    document.getElementById('btnLogin').addEventListener('click', ()=>{ document.getElementById('modalLogin').classList.add('show'); document.body.classList.add('modal-open'); });
    document.getElementById('loginCancel').addEventListener('click', ()=>{ document.getElementById('modalLogin').classList.remove('show'); document.body.classList.remove('modal-open'); });
    document.getElementById('loginSubmit').addEventListener('click', async ()=>{
      const pwd = document.getElementById('login_pwd').value;
      if (!pwd){ document.getElementById('loginMsg').textContent = '请输入密码'; return; }
      const r = await fetch('/api/v1/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd })});
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok){ document.getElementById('modalLogin').classList.remove('show'); alert('登录成功'); location.reload(); } else { document.getElementById('loginMsg').textContent = j?.msg || '登录失败'; }
    });
  } catch (e){
    document.getElementById('app-root').textContent = '初始化失败：' + e.message;
    console.error(e);
  }
}
init();
