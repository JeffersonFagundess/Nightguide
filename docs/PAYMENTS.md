# Pagamentos Mercado Pago

O NightGuide usa o Mercado Pago para testar a compra de ingressos. A API decide o status: um retorno do navegador ou um botao no app nunca aprova o pagamento sozinho.

## Variaveis

```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token
```

Regras:

- Public Key pode ir para o navegador.
- Access Token fica somente no servidor.
- Nunca versionar credenciais reais.

## Rotas

```text
POST /api/payments/mercadopago/card-token
POST /api/payments/mercadopago
GET  /api/payments/mercadopago/[paymentId]
POST /api/payments/mercadopago/preference
GET  /api/payments/mercadopago/preference/[preferenceId]?eventId=...
POST /api/mercadopago/webhook
GET  /api/mercadopago/webhook
```

## Cartao dentro do app

Fluxo:

1. Usuario logado escolhe evento e quantidade.
2. O formulario web envia os dados de teste para tokenizacao com a Public Key.
3. Backend recebe token, evento, quantidade e metodo.
4. Backend chama `/v1/payments` do Mercado Pago usando Access Token.
5. Se aprovado, o app mostra confirmacao na tela e salva ingresso local.
6. Mercado Pago dispara webhook `payment.created` se `notification_url` estiver configurada.

Status de teste:

- `APRO`: aprovado (CPF 12345678909)
- `OTHE`: erro geral
- `CONT`: pendente
- `CALL`: precisa autorizar
- `FUND`: saldo insuficiente
- `SECU`: codigo de seguranca invalido
- `EXPI`: validade invalida
- `FORM`: erro de formulario

## Pix dentro do app

Fluxo ideal:

1. Usuario escolhe Pix.
2. Backend cria pagamento `payment_method_id: pix`.
3. Mercado Pago retorna QR Code e copia e cola.
4. App abre modal Pix com QR, codigo e status.
5. Usuario copia o codigo e consulta o status.
6. O ingresso so e liberado se a API do Mercado Pago responder `approved`.

Se o Mercado Pago recusar a criacao do Pix, o erro e mostrado. Nao e gerado QR alternativo nem ingresso pago.

## Checkout Pro

Fluxo:

1. Usuario clica para ir ao Mercado Pago.
2. Backend cria uma preferencia em `/checkout/preferences`.
3. Retorna `init_point` ou `sandbox_init_point`.
4. O APK abre o `init_point` oficial no navegador do Mercado Pago.
5. Usuario usa uma conta compradora de teste diferente da vendedora e um cartao oficial de teste.
6. O retorno HTTPS mostra um link para voltar ao app. Ao fechar o navegador, o app consulta `GET /api/payments/mercadopago/preference/[preferenceId]` e permite tocar em **Verificar pagamento** novamente.
7. O servidor busca a preferencia e os pagamentos pela `external_reference` exclusiva. Confere usuario, evento e valor; so `approved` gera ingresso. `pending`, `rejected` e ausencia de pagamento nao geram ingresso.
8. Webhook e enviado para `/api/mercadopago/webhook`.

Cartoes oficiais de teste (validade `11/30`): Mastercard `5480 8328 0103 3311`, Visa `4235 6477 2802 5682`, American Express `3753 651535 56885` (CVV `1234`) e Elo debito `5067 7667 8388 8311`. Os demais usam CVV `123`. Nome `APRO` aprova; `OTHE` recusa; `CONT` deixa pendente; CPF `12345678909`.

Para Checkout Pro funcionar em teste:

- Access Token deve pertencer ao vendedor de teste e estar no mesmo ambiente da aplicacao Mercado Pago.
- Pagamento deve ser feito com comprador de teste diferente.
- Nao use a mesma conta real como comprador e vendedor.
- Evite cookies antigos de outra conta no navegador do Mercado Pago. Se necessario, teste em janela anonima.
- O e-mail do comprador deve ser diferente do e-mail da conta vendedora.

Sem credenciais de teste configuradas no deploy e uma conta compradora de teste, o checkout de cartao nao pode ser validado de ponta a ponta. Nao coloque chaves no Git; configure-as nas variaveis do ambiente de hospedagem.

Referencias oficiais: [cartoes de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases), [contas de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts) e [busca de pagamentos](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/search-payments/get).

## Webhook

Endpoint:

```text
https://nightguide-saquarema.vercel.app/api/mercadopago/webhook
```

Hoje o webhook registra logs do evento recebido. Para producao real, evoluir para:

- validar assinatura do Mercado Pago
- buscar o pagamento pelo ID recebido
- gravar pagamento em tabela `payments`
- atualizar tabela `tickets`
- tornar o endpoint idempotente
- armazenar payload bruto para auditoria

## Onde ver transacoes no Mercado Pago

No painel de desenvolvedor:

- Webhooks: mostra entrega das notificacoes, status 200 e `payment.created`.
- Painel de monitoramento: mostra requisicoes da API, normalmente com atraso.
- Detalhe do webhook: mostra ID do recurso. Esse ID pode ser consultado na API de pagamentos.

Em contas de teste, algumas telas comerciais do Mercado Pago podem nao listar tudo igual a conta de producao. Para auditoria tecnica, o ID do pagamento e os logs da Vercel sao mais confiaveis no MVP.

## Horario UTC

O Mercado Pago exibe horarios como `UTC+00:00`. Isso e normal. Para horario de Brasilia, subtraia 3 horas quando estiver em `America/Sao_Paulo` sem horario de verao.

Exemplo:

```text
18:04 UTC -> 15:04 em Brasilia
```

## Limitacoes de teste

- Conta compradora e vendedora precisam ser diferentes.
- Use sempre as credenciais do ambiente de teste; confirme o tipo de token na integracao do Mercado Pago.
- Algumas operacoes de Pix podem variar conforme a conta de teste.
- O checkout externo pode manter cookies do Mercado Pago.
- O painel pode demorar para exibir metricas.

## Recomendacao para proxima fase

Criar tabelas:

- `payments`
- `payment_events`
- `ticket_payments`

E ligar:

```text
Mercado Pago payment id -> payment_events -> tickets.status
```

Assim o ingresso deixa de depender de armazenamento local e passa a ser validado pelo webhook.
