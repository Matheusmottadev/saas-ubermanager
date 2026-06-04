# saas-ubermanager

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.example` e preencha as chaves do Mercado Pago.

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
- `MERCADO_PAGO_ACCESS_TOKEN` configurado.
- `MERCADO_PAGO_PUBLIC_KEY` configurado.
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` configurado.
- Usuario logado no sistema.
- Schema do Prisma aplicado no banco.

## Webhook do Mercado Pago

O fluxo de assinatura usa a rota:

```text
/api/mercadopago/subscription/webhook
```

Em localhost, o Mercado Pago nao consegue chamar essa URL diretamente. Para testar webhooks localmente, exponha sua aplicacao com uma URL publica temporaria, por exemplo com `ngrok`, e cadastre essa URL no painel do Mercado Pago.

Exemplo de webhook em producao:

```text
https://seu-dominio.com/api/mercadopago/subscription/webhook
```

## Checklist de deploy

- Banco de producao ativo.
- Variaveis de ambiente configuradas.
- `prisma db push` ou migrations aplicadas no ambiente publicado.
- URL publica do app funcionando.
- Webhook do Mercado Pago apontando para a URL publicada.
