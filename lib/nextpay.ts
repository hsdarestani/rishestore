import { getSecretSetting } from "@/lib/settings";

const TOKEN_URL = "https://nextpay.org/nx/gateway/token";
const VERIFY_URL = "https://nextpay.org/nx/gateway/verify";
const PAYMENT_URL = "https://nextpay.org/nx/gateway/payment/";

async function postForm(url: string, payload: Record<string, string | number>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) body.set(k, String(v));
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("PAYMENT_NETWORK_ERROR");
  return response.json() as Promise<Record<string, unknown>>;
}

export async function createNextPayTransaction(orderId: string, amount: number) {
  const apiKey = await getSecretSetting("nextpayApiKey");
  if (!apiKey) throw new Error("PAYMENT_NOT_CONFIGURED");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const result = await postForm(TOKEN_URL, {
    api_key: apiKey,
    order_id: orderId,
    amount,
    currency: "IRT",
    callback_uri: siteUrl + "/api/payment/callback",
  });
  if (Number(result.code) !== -1 || !result.trans_id) {
    throw new Error("PAYMENT_TOKEN_ERROR:" + String(result.code ?? "unknown"));
  }
  const transId = String(result.trans_id);
  return { transId, url: PAYMENT_URL + encodeURIComponent(transId) };
}

export async function verifyNextPayTransaction(transId: string, amount: number) {
  const apiKey = await getSecretSetting("nextpayApiKey");
  if (!apiKey) throw new Error("PAYMENT_NOT_CONFIGURED");
  const result = await postForm(VERIFY_URL, { api_key: apiKey, trans_id: transId, amount });
  return { ok: Number(result.code) === 0, code: Number(result.code), raw: result };
}
