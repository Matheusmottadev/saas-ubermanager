# saas-ubermanager

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.example` e preencha as chaves do Stripe quando for integrar a cobrança.

3. Suba o Postgres local:

```bash
npm run db:up
```

4. Aplique o schema no banco:

```bash
npm run prisma:push
```

5. Inicie o app:

```bash
npm run dev
```

Se quiser acompanhar o banco:

```bash
npm run db:logs
```

Para desligar o banco:

```bash
npm run db:down
```

## O que precisa para a assinatura funcionar

- `DATABASE_URL` apontando para um Postgres acessivel.
- `STRIPE_SECRET_KEY` configurado.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurado.
- `STRIPE_WEBHOOK_SECRET` configurado.
- Usuario logado no sistema.
- Schema do Prisma aplicado no banco.

## Stripe

O fluxo de cobranca do site foi preparado para Stripe. A proxima etapa sera conectar o checkout e o webhook com as credenciais do ambiente.

## Checklist de deploy

- Banco de producao ativo.
- Variaveis de ambiente configuradas.
- `prisma db push` ou migrations aplicadas no ambiente publicado.
- URL publica do app funcionando.
- Webhook da Stripe apontando para a URL publicada quando a integracao for concluida.
