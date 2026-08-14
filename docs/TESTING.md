# Testes

Este documento define como validar o NightGuide antes de commit, deploy e apresentacao.

## Testes automatizados atuais

```bash
npm run lint
npm run build
npm audit
```

O projeto ainda nao tem suite unit/e2e formal. Para a proxima fase, recomenda-se:

- Vitest para funcoes puras
- React Testing Library para componentes criticos
- Playwright para fluxos de login, detalhes, favoritos e checkout
- teste de RLS no Supabase

## QA manual desktop

Validar no Chrome/Edge:

1. Abrir `/`.
2. Verificar carrossel em tela cheia.
3. Trocar tema claro/escuro.
4. Trocar idioma PT/EN.
5. Buscar evento por nome, local e categoria.
6. Usar chips de filtro.
7. Abrir detalhes de evento.
8. Fechar modal pelo X e por `Esc`.
9. Abrir detalhes de local.
10. Rolar ate mapa sem zoom acidental.
11. Usar zoom controlado do mapa.
12. Favoritar evento logado.
13. Ver favorito na conta.
14. Comprar ingresso teste.
15. Ver confirmacao na tela.
16. Ver ingresso na conta.

## QA manual mobile

Validar com DevTools e celular real:

1. Header nao quebra em PT nem EN.
2. Botao Entrar/Sign in cabe em uma linha.
3. Carrossel mostra imagem sem cortes agressivos.
4. Texto nao fica gigante.
5. CTA de ingresso cabe na tela.
6. Modal de Pix se ajusta a altura do aparelho.
7. PWA pode ser instalado.
8. App abre em modo standalone.
9. Scroll nao fica preso no mapa.

## Teste de autenticacao

Email/senha:

- criar conta
- confirmar email se o Supabase exigir
- entrar
- sair
- entrar novamente
- acessar `/conta`
- tentar comprar ingresso

Google:

- clicar em continuar com Google
- aceitar permissao
- voltar logado
- confirmar que nao volta para `/login`
- testar no dominio de producao

## Teste Mercado Pago

Cartao aprovado:

- metodo cartao
- cartao de teste oficial
- nome `APRO`
- CPF de teste
- verificar pagamento confirmado
- verificar ingresso gerado

Cartao recusado:

- nome `OTHE`, `FUND`, `SECU`, `EXPI` ou `FORM`
- confirmar mensagem de erro/recusa

Pix:

- gerar Pix
- abrir modal
- copiar codigo
- ver mensagem de copiado
- confirmar simulacao
- ver ingresso gerado

Checkout Pro:

- abrir Mercado Pago
- logar comprador de teste
- finalizar
- voltar para app
- verificar webhook no painel

## Teste de SQL injection

Como o app usa Supabase client e API routes com validacao, os testes devem focar entradas do usuario:

- busca: `'; drop table events; --`
- email invalido
- quantidade negativa
- quantidade muito alta
- eventId inexistente
- metodo de pagamento invalido
- paymentId com letras

Resultado esperado:

- nenhuma query SQL bruta executada
- API retorna 400/404 onde fizer sentido
- app nao quebra
- RLS continua protegendo dados

## Teste de secrets

Antes do push:

```bash
git grep -n -I "MERCADOPAGO_ACCESS_TOKEN\\|service_role\\|client_secret\\|TEST-" HEAD
```

O resultado nao deve conter token real. `.env.example` pode conter placeholders como `TEST-sua-public-key`.

## Teste de deploy

Depois do deploy:

1. Abrir a URL final.
2. Verificar se nao pede login para acessar a home.
3. Testar `/login`.
4. Testar Google.
5. Testar `/ingressos/sunset-beats`.
6. Testar webhook `GET /api/mercadopago/webhook`.
7. Conferir logs da Vercel durante um pagamento.

## Criterio de pronto

O MVP esta pronto quando:

- build passa
- lint passa
- home publica abre sem login
- login funciona
- conta funciona
- carrossel responsivo funciona
- mapa nao atrapalha scroll
- checkout teste gera confirmacao
- PWA instala no celular
- nenhum segredo foi commitado
