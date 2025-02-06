import { assertEquals } from "jsr:@std/assert";
import { getInitVaryCookieObject, formatObjectToCookieString } from "./varyCookies.ts";

Deno.test("getInitVaryCookieObject with empty environment variable", () => {
  Deno.env.set('BUNNY_VARY_COOKIES', '');
  const result = getInitVaryCookieObject();
  assertEquals(result, {});
});

Deno.test("getInitVaryCookieObject with valid environment variable", () => {
  Deno.env.set('BUNNY_VARY_COOKIES', 'key1=value1;key2=value2');
  const result = getInitVaryCookieObject();
  assertEquals(result, { key1: 'value1', key2: 'value2' });
});

Deno.test("formatObjectToCookieString with empty object", () => {
  const result = formatObjectToCookieString({});
  assertEquals(result, '');
});

Deno.test("formatObjectToCookieString with valid object", () => {
  const obj = { key1: 'value1', key2: 'value2' };
  const result = formatObjectToCookieString(obj);
  assertEquals(result, 'key1=value1; key2=value2');
});

Deno.test("formatObjectToCookieString with special characters", () => {
  const obj = { key1: 'value 1', key2: 'value@2' };
  const result = formatObjectToCookieString(obj);
  assertEquals(result, 'key1=value%201; key2=value%402');
});