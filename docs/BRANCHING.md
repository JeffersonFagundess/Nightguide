# Estrategia de branches

O projeto tera duas linhas principais de evolucao.

## main

Branch principal do MVP hibrido/PWA.

Responsabilidades:

- manter site funcionando na Vercel
- manter PWA instalavel
- corrigir bugs da versao web
- manter documentacao base
- preservar integracoes Supabase e Mercado Pago

Nao deve receber mudancas que quebrem a versao web atual.

## native-regression

Branch da regressao/migracao para app nativo.

Objetivo:

- sair gradualmente do modelo hibrido/PWA
- iniciar base nativa
- testar recursos que navegador/PWA nao entrega tao bem
- separar decisoes nativas da versao web estavel

Nome escolhido:

```text
native-regression
```

## Por que nao migrar direto na main

Porque a versao web atual ja funciona e esta pronta para apresentacao. A migracao nativa vai trocar partes grandes:

- roteamento
- mapa
- armazenamento offline
- notificacoes
- camera/galeria
- permissoes
- fluxo de build
- possivelmente pagamentos/deep links

Separar por branch evita perder o MVP hibrido.

## Fluxo recomendado

1. `main`: correcoes do MVP atual.
2. `native-regression`: estudos e implementacao nativa.
3. Quando a nativa estiver madura, criar PR comparativo.
4. Decidir se a nativa vira novo produto principal ou se convivem:
   - web/PWA
   - mobile nativo

## Padrao de commits

Sugestao:

```text
docs: ...
feat: ...
fix: ...
chore: ...
refactor: ...
test: ...
```

Exemplos:

```text
docs: document native migration plan
feat: add owner event editor
fix: keep auth session after google callback
chore: configure pwa icons
```

## Protecao de main

Quando o repositorio estiver no GitHub, recomenda-se:

- exigir PR para `main`
- exigir build passando
- impedir push direto em producao
- revisar secrets antes de merge

## Documentos da branch nativa

A branch `native-regression` deve manter:

- `docs/NATIVE_ROADMAP.md`
- decisoes de stack
- lista de recursos nativos
- telas que serao migradas
- recursos removidos da PWA
- plano de compatibilidade com Supabase e Mercado Pago
