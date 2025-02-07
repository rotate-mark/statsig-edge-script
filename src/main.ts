import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.11.3";
import * as Cookie from "https://esm.sh/cookie@1.0.2";
import * as UA from "https://esm.sh/ua-parser-js@2.0.1/helpers";
import * as StatsigSDK from "https://esm.sh/statsig-node@6.3.1";
import { formatObjectToCookieString, getInitVaryCookieObject } from "./varyCookies.ts";

console.log("Starting server...");
const listener = BunnySDK.net.tcp.unstable_new();

console.log("Listening on: ", BunnySDK.net.tcp.toString(listener));
BunnySDK.net.http.serve(
  async (req) => {
    console.log(`[INFO]: ${req.method} - ${req.url}`);

    /**
     * Reset request to BUNNY_PULL_ZONE_DOMAIN
     */
    const host = Deno.env.get('BUNNY_PULL_ZONE_DOMAIN')
    if (!host) {
      throw new Error('BUNNY_PULL_ZONE_DOMAIN is not set')
    }

    const url = new URL(req.url)
    const { pathname } = url
    url.host = host;
    url.port = ''
    url.protocol = 'https:'

    const newRequest = new Request(url)

    const requestAccept = req.headers.get('accept') || ''
    if (requestAccept) {
      newRequest.headers.set('accept', requestAccept)
    }
  
    const includedVaryCookie = getInitVaryCookieObject()

    const ua = req.headers.get('User-Agent') ?? ''
    const isBot = UA.isBot(ua)

    /**
     * Early return default vary for web crawlers
     */
    if (isBot) {
      newRequest.headers.set('cookie', formatObjectToCookieString(includedVaryCookie))
    
      return fetch(newRequest)
    }

    /**
     * Early return default vary if non-{page/method:GET} requests
     */
    const isRequestHttpMethodGET = req.method === 'GET'
    const isDotPathnameRequest = pathname.includes('.')
    const isHTMLRequest = pathname.endsWith('.html')

    if (!isRequestHttpMethodGET || (isDotPathnameRequest && !isHTMLRequest)) {
      newRequest.headers.set('cookie', formatObjectToCookieString(includedVaryCookie))
    
      return fetch(newRequest)
    }

    /**
     * Try to identify user via cookie
     */
    const rawCookies = req.headers.get('cookie') ?? ''
    const cookies = Cookie.parse(rawCookies)

    const NAME_USER_IDENTIFIER = Deno.env.get('COOKIE_NAME_USER_IDENTIFIER')
    if (!NAME_USER_IDENTIFIER) {
      throw new Error('COOKIE_NAME_USER_IDENTIFIER is not set')
    }

    const isNewUser = !cookies[NAME_USER_IDENTIFIER]

    const userID = cookies[NAME_USER_IDENTIFIER] ?? crypto.randomUUID();
    const userIP = req.headers.get('x-real-ip') ?? ''

    const userObject = {
      userID,
      ...(ua && { userAgent: ua }),
      ...(userIP && { ip: userIP })
    }

    const serverSecret = Deno.env.get('SECRET_STATSIG_SERVER_KEY')
    if (!serverSecret) {
      throw new Error('SECRET_STATSIG_SERVER_KEY is not set')
    }

    /**
     * Get vary from feature_gates
     */
    await StatsigSDK.default.initialize(serverSecret)
    const bootstrap = StatsigSDK.default.getClientInitializeResponse(userObject, null, { hash: 'none' })
    const gates = Object.entries(bootstrap.feature_gates).map(([k, o]) => ([k, (o as Record<string, boolean>).value ? 1 : 0] satisfies [string, number] ))
    gates.sort(([aKey, _a], [bKey, _b]) => aKey.localeCompare(bKey))

    includedVaryCookie.statsig_gates = JSON.stringify(gates)
    newRequest.headers.set('cookie', formatObjectToCookieString(includedVaryCookie))

    /**
     * Return Promise<Response> since no need to set user cookie
     */
    if (!isNewUser) {
      return fetch(newRequest)
    }

    /**
     * Rewrite response to set cookie for NAME_USER_IDENTIFIER
     */
    const response = await fetch(newRequest)
    const responseText = await response.text()

    const newResponse = new Response(responseText, response)
    newResponse.headers.append('Set-Cookie', `${NAME_USER_IDENTIFIER}=${userID}; Domain=.${host}; Path=/; Max-Age=2592000; Secure`);
    
    return newResponse
  },
);
