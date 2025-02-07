export function getInitVaryCookieObject() {
  const envVaryCookies = Deno.env.get('BUNNY_VARY_COOKIES') ?? ''

  return Object.fromEntries(envVaryCookies.split(';').map(r => r !== '' && r.split('=')).filter(Boolean) as []) satisfies Record<string, string>
}

export function formatObjectToCookieString(obj: Record<string, string>) {
  const keys = Object.keys(obj);

  return keys.map(k => `${k}=${encodeURIComponent(obj[k])}`).join('; ');
}