# Referencia de APIs internas

As APIs internas ficam em `src/app/api`. Elas rodam no servidor Next.js e podem acessar variaveis privadas.

## Autenticacao exigida

As rotas de pagamento chamam `getCurrentSession()`. Se nao houver usuario logado, retornam `401`.

Resposta comum:

```json
{
  "error": "Login necessario para comprar ingresso."
}
```

## POST /api/payments/mercadopago/card-token

Tokeniza um cartao usando a Public Key do Mercado Pago.

Entrada esperada:

```json
{
  "cardNumber": "5031433215406351",
  "securityCode": "123",
  "expirationMonth": "11",
  "expirationYear": "2030",
  "cardholderName": "APRO",
  "identificationType": "CPF",
  "identificationNumber": "12345678909"
}
```

Saida:

```json
{
  "token": "card_token_id",
  "paymentMethodId": "master",
  "issuerId": 123
}
```

Erros comuns:

- Public Key ausente.
- Campos invalidos.
- Mercado Pago retornou erro de validacao.

## POST /api/payments/mercadopago

Cria pagamento dentro do app.

Cartao:

```json
{
  "method": "card",
  "eventId": "sunset-beats",
  "quantity": 1,
  "token": "card_token_id",
  "paymentMethodId": "master",
  "issuerId": 123,
  "installments": 1,
  "payerEmail": "comprador@test.com",
  "identificationType": "CPF",
  "identificationNumber": "12345678909",
  "testStatus": "APRO"
}
```

Pix:

```json
{
  "method": "pix",
  "eventId": "sunset-beats",
  "quantity": 1,
  "payerEmail": "comprador@test.com",
  "identificationType": "CPF",
  "identificationNumber": "12345678909"
}
```

Saida:

```json
{
  "debugId": "uuid",
  "event": {
    "id": "sunset-beats",
    "title": "Sunset Beats",
    "venue": "Quiosque Maralto"
  },
  "quantity": 1,
  "total": 25,
  "payment": {
    "id": "payment_id",
    "status": "approved",
    "statusDetail": "accredited",
    "paymentMethodId": "master",
    "paymentTypeId": "credit_card",
    "totalPaidAmount": 25
  }
}
```

Para Pix, `payment` pode incluir:

- `qrCode`
- `qrCodeBase64`
- `ticketUrl`
- `expiresAt`

## GET /api/payments/mercadopago/[paymentId]

Consulta status de pagamento no Mercado Pago.

Entrada:

```text
/api/payments/mercadopago/123456789
```

Regras:

- `paymentId` precisa ser numerico.
- Usuario precisa estar logado.

Saida:

```json
{
  "payment": {
    "id": "123456789",
    "status": "approved",
    "statusDetail": "accredited",
    "paymentMethodId": "pix",
    "paymentTypeId": "bank_transfer",
    "totalPaidAmount": 25
  }
}
```

## POST /api/payments/mercadopago/preference

Cria preferencia para Checkout Pro.

Entrada:

```json
{
  "eventId": "sunset-beats",
  "quantity": 1
}
```

Saida:

```json
{
  "debugId": "uuid",
  "preferenceId": "preference_id",
  "collectorId": 123456,
  "checkoutHost": "sandbox.mercadopago.com.br",
  "checkoutUrl": "https://sandbox.mercadopago.com.br/checkout/..."
}
```

Observacao:

- `checkoutUrl` deve ser aberto no navegador.
- O usuario deve pagar com comprador de teste diferente do vendedor.

## POST /api/mercadopago/webhook

Recebe notificacoes do Mercado Pago.

Exemplo de payload:

```json
{
  "action": "payment.created",
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

Resposta:

```json
{
  "ok": true
}
```

Hoje o webhook registra logs. Em producao, deve validar assinatura, buscar o pagamento pelo ID e atualizar tabelas.

## GET /api/mercadopago/webhook

Healthcheck do webhook.

Saida:

```json
{
  "ok": true,
  "provider": "mercadopago"
}
```

## Logs

Padrao de logs:

```text
[NightGuide][MercadoPago][payment:start]
[NightGuide][MercadoPago][payment:created]
[NightGuide][MercadoPago][payment:error]
[NightGuide][MercadoPago][payment:fallback]
[NightGuide][MercadoPago][preference:start]
[NightGuide][MercadoPago][preference:created]
[NightGuide][MercadoPago][webhook:received]
```

Todo fluxo de pagamento gera `debugId` para cruzar frontend, API e logs da Vercel.
