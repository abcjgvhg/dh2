export async function onRequestPost(context){
  const { request, env } = context;
  const KV = env.DAOHANG || env.daohang;
  // check effective auth
  let sRaw = KV ? await KV.get('state') : null;
  let requireAuth = false;
  if (sRaw){
    try { const st = JSON.parse(sRaw); requireAuth = Boolean(st?.settings?.requireAuth); } catch(e){}
  }
  const effective = Boolean(requireAuth) === true;
  if (effective){
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(s=>s.trim()).filter(Boolean).map(p=>p.split('=').map(x=>x.trim())));
    const token = cookies['NAV_SESSION'];
    if (!token) return new Response(JSON.stringify({ ok:false, msg:'未登录' }), { status:401, headers:{ 'Content-Type':'application/json' }});
    const ok = KV ? await KV.get('session:'+token) : null;
    if (!ok) return new Response(JSON.stringify({ ok:false, msg:'未登录或已过期' }), { status:401, headers:{ 'Content-Type':'application/json' }});
  }
  try {
    const body = await request.json().catch(()=>null);
    if (!body) return new Response(JSON.stringify({ ok:false, msg:'invalid json' }), { status:400, headers:{ 'Content-Type':'application/json' }});
    const st = {
      settings: Object.assign({ title: "我的导航", background: "", backgroundMode: "single", backgrounds: [], bgRotateInterval: 0, bingMarket: "en-US", overlayOpacity: 0.12, tagOpacity: 0.12, groupOpacity: 0.96, darkMode: false, accentRgb: "91,140,255", liquidGlass: false, liquidStrength: 0.5, bgNoCache: false, requireAuth: false }, body.settings || {}),
      groups: Array.isArray(body.groups) && body.groups.length ? body.groups : []
    };
    if (KV) await KV.put('state', JSON.stringify(st));
    return new Response(JSON.stringify({ ok:true }), { headers:{ 'Content-Type':'application/json' }});
  } catch (e){
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status:500, headers:{ 'Content-Type':'application/json' }});
  }
}
