# Pagamentos Mercado Pago

O NightGuide usa Mercado Pago em ambiente de teste para simular compra de ingressos. O objetivo do MVP e demonstrar o fluxo do usuario, webhooks e confirmacao visual sem fazer cobranca real.

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
POST /api/mercadopago/webhook
GET  /api/mercadopago/webhook
```

## Cartao dentro do app

Fluxo:

1. Usuario logado escolhe evento e quantidade.
2. Frontend tokeniza o cartao usando a Public Key.
3. Backend recebe token, evento, quantidade e metodo.
4. Backend chama `/v1/payments` do Mercado Pago usando Access Token.
5. Se aprovado, o app mostra confirmacao na tela e salva ingresso local.
6. Mercado Pago dispara webhook `payment.created` se `notification_url` estiver configurada.

Status de teste:

- `APRO`: aprovado
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
5. Usuario copia o codigo.
6. Em teste, usuario confirma a simulacao para liberar o ingresso.

Comportamento do MVP:

- Se o Mercado Pago retornar QR real, o app usa os dados retornados.
- Se a sandbox negar por restricao de conta/teste, o app gera um Pix visual de demonstracao.
- O fallback fica identificado como teste e nao representa uma cobranca real.

## Checkout Pro

Fluxo:

1. Usuario clica para ir ao Mercado Pago.
2. Backend cria uma preferencia em `/checkout/preferences`.
3. Retorna `init_point` ou `sandbox_init_point`.
4. Browser abre o checkout oficial do Mercado Pago.
5. Usuario paga com comprador de teste.
6. Mercado Pago volta para as `back_urls`.
7. Webhook e enviado para `/api/mercadopago/webhook`.

Para Checkout Pro funcionar em sandbox:

- Access Token deve pertencer ao vendedor de teste.
- Pagamento deve ser feito com comprador de teste diferente.
- Nao use a mesma conta real como comprador e vendedor.
- Evite cookies antigos de outra conta no navegador do Mercado Pago.

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
- Credenciais `TEST-` nao fazem cobranca real.
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
