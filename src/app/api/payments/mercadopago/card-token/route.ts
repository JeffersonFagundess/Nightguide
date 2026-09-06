import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import { getMercadoPagoPublicKey } from "@/lib/mercadopago-server";

type CardTokenBody = {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  holder?: string;
  cpf?: string;
};

type CardTokenResponse = {
  id?: string;
  message?: string;
  error?: string;
  cause?: Array<{ code?: string | number; description?: string }>;
};

export async function POST(request: Request) {
  const debugId = crypto.randomUUID();
  try {
    const session = await getCurrentSession(request);
    if (!session) {
      console.warn("[NightGuide][MercadoPago][card-token:unauthorized]", { debugId });
      return NextResponse.json({ error: "Login necessario para tokenizar cartao." }, { status: 401 });
    }

    const publicKey = getMercadoPagoPublicKey();
    if (!publicKey) {
      console.error("[NightGuide][MercadoPago][card-token:no-public-key]", { debugId });
      return NextResponse.json({ error: "Public Key do Mercado Pago nao configurada." }, { status: 500 });
    }

    const body = (await request.json()) as CardTokenBody;
    const cardNumber = onlyDigits(body.cardNumber);
    const parsedExpiry = parseExpiry(body.expiry ?? "");
    const cvv = onlyDigits(body.cvv);
    const holder = typeof body.holder === "string" ? body.holder.trim() : "";
    const cpf = onlyDigits(body.cpf);

    if (cardNumber.length < 12 || !parsedExpiry || cvv.length < 3 || holder.length < 2 || cpf.length !== 11) {
      console.warn("[NightGuide][MercadoPago][card-token:invalid-input]", {
        debugId,
        cardDigits: cardNumber.length,
        hasExpiry: Boolean(parsedExpiry),
        cvvDigits: cvv.length,
        holderLength: holder.length,
        cpfDigits: cpf.length,
      });
      return NextResponse.json({ error: "Dados do cartao de teste incompletos." }, { status: 400 });
    }

    console.info("[NightGuide][MercadoPago][card-token:start]", {
      debugId,
      sessionEmail: session.email,
      cardLast4: cardNumber.slice(-4),
      expiryMonth: parsedExpiry.month,
      expiryYear: parsedExpiry.year,
      holder,
    });

    const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        card_number: cardNumber,
        expiration_month: parsedExpiry.month,
        expiration_year: parsedExpiry.year,
        security_code: cvv,
        cardholder: {
          name: holder,
          identification: {
            type: "CPF",
            number: cpf,
          },
        },
      }),
    });
    const data = (await response.json()) as CardTokenResponse;

    if (!response.ok || !data.id) {
      console.warn("[NightGuide][MercadoPago][card-token:error]", {
        debugId,
        status: response.status,
        message: formatCardTokenError(data),
      });
      return NextResponse.json({ error: formatCardTokenError(data) }, { status: response.status || 400 });
    }

    console.info("[NightGuide][MercadoPago][card-token:created]", { debugId, tokenId: data.id });
    return NextResponse.json({ debugId, token: data.id }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[NightGuide][MercadoPago][card-token:fatal]", {
      debugId,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json({ debugId, error: error instanceof Error ? error.message : "Erro ao tokenizar cartao." }, { status: 500 });
  }
}

function onlyDigits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function parseExpiry(value: string) {
  const [monthRaw, yearRaw] = value.split("/");
  const month = Number(monthRaw);
  const yearNumber = Number(yearRaw);
  const year = yearRaw?.length === 2 ? 2000 + yearNumber : yearNumber;

  if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12 || year < 2026) {
    return null;
  }

  return { month, year };
}

function formatCardTokenError(error: CardTokenResponse) {
  const firstCause = error.cause?.find((item) => item.description);
  return firstCause?.description ?? error.message ?? error.error ?? "Nao foi possivel tokenizar o cartao no Mercado Pago.";
}
