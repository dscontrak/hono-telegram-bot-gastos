# Hono Telegram

## Dependencias e instalar

```sh
# Solo cuando no esta el archivo: package.json 
pnpm create hono@latest .
```

1. Selecciona `cloudflare-workers` 
1. No instales las dependencias
1. Instalar las dependecias: `pnpm install` manualmente

## Ejecutar

1. Iniciar localmente: `pnpm dev`
1. Iniciar localmente y exponer en red local: `pnpm dev:network`

## Desplegar

1. Hacer login:  `pnpm wrangler login`
1. Despleyar el proyecto: `pnpm deploy`

## GIT 

```sh
git init
git branch -M main
git commit -m "first commit"
git push -u origin main
```