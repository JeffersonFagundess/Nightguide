# Escopo da branch native-regression

Esta branch existe para iniciar a regressao/migracao do NightGuide hibrido/PWA para um app nativo.

## Objetivo da branch

Construir uma versao nativa sem quebrar a versao web atual da branch `main`.

## Base inicial

A branch parte do MVP hibrido atual:

- Next.js
- React
- Supabase
- Mercado Pago
- PWA
- mapa web
- armazenamento local/IndexedDB

## Direcao da migracao

Stack recomendada:

```text
Expo + React Native + TypeScript
```

## Primeiras tarefas futuras

1. Criar estrutura `apps/mobile`.
2. Configurar Expo Router.
3. Reaproveitar modelos de dados do Supabase.
4. Criar tela inicial nativa.
5. Migrar auth.
6. Migrar listagem de eventos.
7. Migrar mapa para componente nativo.
8. Adicionar camera e galeria.
9. Adicionar notificacoes.
10. Adicionar QR Code de ingresso.

## Recursos nativos prioritarios

- camera
- galeria
- upload de imagem
- notificacoes push
- notificacoes locais
- localizacao
- mapa nativo
- scanner QR Code
- armazenamento offline
- deep links

## O que nao deve ser feito aqui sem decisao

- deletar a versao web inteira
- remover Supabase
- remover Mercado Pago
- trocar banco de dados
- colocar credenciais reais no repositorio

## Como voltar ao MVP hibrido

Use:

```bash
git switch main
```

A branch `main` continua sendo a versao estavel para Vercel/PWA.
