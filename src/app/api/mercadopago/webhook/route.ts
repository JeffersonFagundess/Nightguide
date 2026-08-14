import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const debugId = crypto.randomUUID();
  const payload = await request.json().catch(() => ({}));
  console.info("[NightGuide][MercadoPago][webhook:received]", {
    debugId,
    type: typeof payload === "object" && payload !== null && "type" in payload ? payload.type : null,
    action: typeof payload === "object" && payload !== null && "action" in payload ? payload.action : null,
    dataId:
      typeof payload === "object" &&
      payload !== null &&
      "data" in payload &&
      typeof payload.data === "object" &&
      payload.data !== null &&
      "id" in payload.data
        ? payload.data.id
        : null,
  });

  return NextResponse.json({
    debugId,
    received: true,
    type: typeof payload === "object" && payload !== null && "type" in payload ? payload.type : null,
  });
}

export async function GET() {
  console.info("[NightGuide][MercadoPago][webhook:healthcheck]");
  return NextResponse.json({ ok: true, provider: "mercadopago" });
}
