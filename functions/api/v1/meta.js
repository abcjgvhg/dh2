export async function onRequestGet(context){
  const { env } = context;
  return new Response(JSON.stringify({ authEnabled: String(env.AUTH_ENABLED || 'false') }), { headers:{ 'Content-Type':'application/json' }});
}
