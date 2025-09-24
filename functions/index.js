export async function onRequest(context){
  const { request, env } = context;
  const KV = env.DAOHANG || env.daohang;
  // try to get state to decide requireAuth
  let sRaw = null;
  try { sRaw = KV ? await KV.get('state') : null } catch(e){}
  if (!sRaw){
    const DEFAULT_STATE = {
      settings: { title: "我的导航", background: "", backgroundMode: "single", backgrounds: [], bgRotateInterval: 0, bingMarket: "en-US", overlayOpacity: 0.12, tagOpacity: 0.12, groupOpacity: 0.96, darkMode: false, accentRgb: "91,140,255", liquidGlass: false, liquidStrength: 0.5, bgNoCache: false, requireAuth: false }, groups: [{ id: "g_1", name: "常用", items: [{ id: "i_google", title: "Google", url: "https://www.google.com", desc: "搜索" }, { id: "i_github", title: "GitHub", url: "https://github.com", desc: "代码托管" }]}]
    };
    if (KV) await KV.put('state', JSON.stringify(DEFAULT_STATE));
    sRaw = JSON.stringify(DEFAULT_STATE);
  }
  let requireAuth = false;
  try { const st = JSON.parse(sRaw); requireAuth = Boolean(st?.settings?.requireAuth); } catch(e){}
  const effective = Boolean(requireAuth) === true;
  if (effective){
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(s=>s.trim()).filter(Boolean).map(p=>p.split('=').map(x=>x.trim())));
    const token = cookies['NAV_SESSION'];
    if (!token){
      return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录</title></head><body style="font-family:Arial,sans-serif;padding:20px;"><h2>需要登录</h2><p>请使用管理员密码登录以访问此页面。</p><label>密码：<input id="pwd" type="password" /></label><button id="btn">登录</button><div id="msg" style="color:#a00;margin-top:12px"></div><script>document.getElementById('btn').onclick = async function(){const pwd = document.getElementById('pwd').value; const r = await fetch('/api/v1/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd })}); const j = await r.json().catch(()=>({})); if (r.ok && j.ok){ location.href = '/'; } else { document.getElementById('msg').textContent = j?.msg || '登录失败'; }};</script></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 401 });
    }
    const ok = KV ? await KV.get('session:'+token) : null;
    if (!ok){
      return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录</title></head><body style="font-family:Arial,sans-serif;padding:20px;"><h2>session 已过期或无效</h2><p>请重新登录。</p><label>密码：<input id="pwd" type="password" /></label><button id="btn">登录</button><div id="msg" style="color:#a00;margin-top:12px"></div><script>document.getElementById('btn').onclick = async function(){const pwd = document.getElementById('pwd').value; const r = await fetch('/api/v1/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd })}); const j = await r.json().catch(()=>({})); if (r.ok && j.ok){ location.href = '/'; } else { document.getElementById('msg').textContent = j?.msg || '登录失败'; }};</script></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 401 });
    }
  }
  // serve static assets (index.html) via ASSETS binding
  return await env.ASSETS.fetch(request);
}
