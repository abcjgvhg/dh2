export async function onRequestGet(context){
  const { env } = context;
  const KV = env.DAOHANG || env.daohang;
  try {
    const sRaw = KV ? await KV.get('state') : null;
    let requireAuth = false;
    if (sRaw) { try { const st = JSON.parse(sRaw); requireAuth = Boolean(st?.settings?.requireAuth); } catch(e){} }
    return new Response(JSON.stringify({ authEnabled: requireAuth ? 'only' : 'false' }), { headers:{ 'Content-Type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ authEnabled: String(env.AUTH_ENABLED || 'false') }), { headers:{ 'Content-Type':'application/json' } });
  }
}