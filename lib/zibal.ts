const REQUEST_URL = "https://gateway.zibal.ir/v1/request";
const VERIFY_URL = "https://gateway.zibal.ir/v1/verify";
const START_URL = "https://gateway.zibal.ir/start/";

function merchant() {
  const value = String(process.env.ZIBAL_MERCHANT || "").trim();
  if (!value) throw new Error("PAYMENT_NOT_CONFIGURED");
  return value;
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("PAYMENT_NETWORK_ERROR");
  return response.json() as Promise<Record<string, unknown>>;
}

export async function createZibalTransaction(input: {
  amountToman: number;
  orderCode: string;
  mobile?: string | null;
}) {
  const callbackBase = (process.env.ZIBAL_CALLBACK_BASE_URL || "https://rishe.store").replace(/\/$/, "");
  const amountRial = Math.max(0, Math.trunc(input.amountToman * 10));
  const result = await postJson(REQUEST_URL, {
    merchant: merchant(),
    amount: amountRial,
    callbackUrl: callbackBase + "/api/payment/callback",
    description: "سفارش ریشه " + input.orderCode,
    ...(input.mobile ? { mobile: input.mobile } : {}),
  });

  if (Number(result.result) !== 100 || !result.trackId) {
    const code = String(result.result ?? "unknown");
    const message = result.message ? String(result.message) : "";
    console.error("ZIBAL_REQUEST_FAILED", { code, message });
    throw new Error("PAYMENT_REQUEST_ERROR:" + code);
  }

  const trackId = String(result.trackId);
  return {
    trackId,
    amountRial,
    url: START_URL + encodeURIComponent(trackId),
  };
}

export async function verifyZibalTransaction(trackId: string) {
  const result = await postJson(VERIFY_URL, {
    merchant: merchant(),
    trackId: Number(trackId),
  });

  const code = Number(result.result);
  const amountRial = Number(result.amount || 0);
  return {
    ok: code === 100 || code === 201,
    code,
    amountRial: Number.isFinite(amountRial) ? amountRial : 0,
    refNumber: result.refNumber ? String(result.refNumber) : "",
    raw: result,
  };
}

export function zibalStartUrl(trackId: string) {
  return START_URL + encodeURIComponent(trackId);
}
