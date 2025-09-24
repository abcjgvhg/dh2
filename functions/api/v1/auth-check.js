export async function onRequestGet(context){
  const { request, env } = context;
  const KV = env.DAOHANG || env.daohang;
  let sRaw = null;
  try { sRaw = KV ? await KV.get('state') : null } catch(e){}
  let requireAuth = false;
  if (sRaw){
    try { const st = JSON.parse(sRaw); requireAuth = Boolean(st?.settings?.requireAuth); } catch(e){}
  }
  const effective = String(env.AUTH_ENABLED || 'false') === 'only' || requireAuth === true;
  if (!effective) return new Response(JSON.stringify({ authed: true }), { headers:{ 'Content-Type':'application/json' }});
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(s=>s.trim()).filter(Boolean).map(p=>p.split('=').map(x=>x.trim())));
  const token = cookies['NAV_SESSION'];
  if (!token) return new Response(JSON.stringify({ authed: false }), { headers:{ 'Content-Type':'application/json' }});
  const ok = KV ? await KV.get('session:'+token) : null;
  return new Response(JSON.stringify({ authed: !!ok }), { headers:{ 'Content-Type':'application/json' }});
}
