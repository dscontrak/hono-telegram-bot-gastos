# Requerimiento procesar gastos 

Crear una api para que lo consuma por medio de Telegram hook usando un bot.
Requerimientos para procesar los mensajes:

1. Va exisitir un comando `/save` para guardar un mensaje en bd
1. Ejemplo de Mensaje: `/save 6000.00 #tdc #bmex Gasto del costo` y se guardara en una base de datos de la siguiente manera:

```markdown

Tabla: GASTOS Campo | Contenido | Comentario:
- GASTO_ID| 1000| Unico y auto incrementa
- MONTO| 6000.00| en decimal; es decir REAL
- DESCRIPCION | Gasto del costco
- CREADO | 2026-09-05 10:00:00 |Fecha de creacion por defecto
- MODIFICADO | 2026-09-05 10:00:00 |Fecha de creacion por defecto

---------

Tabla: ETIQUETAS_GASTOS, Campo | Contenido | Comentario:
- ETIQUETAS_GASTOS_ID| 1000| Unico y auto incrementa
- ETIQUETA_ID | 1000 | Etiqueta ID 
- GASTO_ID | 1000 | Gasto ID 

Otro registro:

- ETIQUETAS_GASTOS_ID| 1000| Unico y auto incrementa
- ETIQUETA_ID | 1001 | Etiqueta ID 
- GASTO_ID | 1000 | Gasto ID 

---------

Tabla: ETIQUETAS
- ETIQUETA_ID| 1000| Unico y auto incrementa
- ETIQUETA | TDC

Otro registro:
- ETIQUETA_ID| 1001| Unico y auto incrementa
- ETIQUETA | BMEX

Nota: Etiqueta debe ser unica

---------
Tabla: MENSAJES
- GASTO_ID | 1000 | Relacion con GASTOS_ID
- MENSAJE_TG_ID | 87987978 | Telegram mensaje id
- CHAT_TG_ID | 23283738478 | Entero largo del chat de telegram

Nota: PRIMARY KEY(MENSAJE_TG_ID, CHAT_TG_ID)


```

Especificaciones adicionales

1. Es para un unico usuario o grupo
1. El numero va ser sin comas o simbolos solo con decimales: Ejemplo `6000.00`
1. La etiqueta es mayusculas o minusculas, en la base de datos se guarda en Mayusculas
1. La etiqueta solo deben ser letras o numeros y guiones (como separador de palabras), NO simbolos, sino se guarda en la descripcion, todo lo que tenga un hash `#` y letras despues es una etiquta.
1. El monto va siempre despues del comando y puede ser decimal
1. No usar Drizzle-ORM, usar solamente Kysely
1. Utilizar env variables
1. Monto debe ser mayor a cero
1. El mensaje puede no tener tags

## Ejemplos 

### Validos

1. `/save 5000.00 #tdc #otro-mas Gasto otro`
1. `/save 5000 Este es otro #tdc #otro-mas que ayuda 999`

### No validos

1. `/save  Este es otro #tdc #otro-mas que ayuda 9000` el numero va al principio
1. `/save #tdc #otro-mas que ayuda 9000.00` el numero va al principio

### Algunas `.env` variables

- BOT_TOKEN              -> secret (wrangler secret)
- WEBHOOK_SECRET_TOKEN   -> secret para verificar Telegram header
- ALLOWED_CHAT_ID        -> var o secret? "23283738478" del ejemplo sino esta definida entonce permitir cualquier mensaje para pruebas

## Una estructura posible:

```txt
src/
├── index.ts
├── config.ts
├── routes/
│   └── telegram.routes.ts
├── controllers/
│   └── telegram.controller.ts
├── commands/
│   ├── command.router.ts
│   ├── start.command.ts
│   └── help.command.ts
├── services/
│   └── telegram.service.ts
└── repositories/
    └── message.repository.ts
```