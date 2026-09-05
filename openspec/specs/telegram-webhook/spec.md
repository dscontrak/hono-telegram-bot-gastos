## Purpose

Permite que Telegram entregue mensajes al Worker via webhook de forma segura, idempotente y filtrada por chat, desacoplando la ingesta del dominio de gastos.

## Requirements

### Requirement: Webhook ingestion endpoint

The system SHALL expose `POST /webhook` (Hono) that accepts Telegram Update JSON and `GET /` as health check, running on Cloudflare Workers.

#### Scenario: Telegram delivers an update
- **WHEN** Telegram POSTs a valid Update JSON to `/webhook`
- **THEN** the system SHALL return HTTP 200 within the Telegram timeout window and process the update asynchronously

#### Scenario: Health check
- **WHEN** a client GETs `/`
- **THEN** the system SHALL return 200 with a plain text body (e.g., `Hello Hono!` or `ok`)

### Requirement: Webhook secret verification

The system SHALL verify the `X-Telegram-Bot-Api-Secret-Token` header against the `WEBHOOK_SECRET_TOKEN` env var (wrangler secret) and reject unauthorized requests.

#### Scenario: Valid secret
- **WHEN** request header `X-Telegram-Bot-Api-Secret-Token` equals `WEBHOOK_SECRET_TOKEN`
- **THEN** the system SHALL continue to allowlist and command processing

#### Scenario: Invalid or missing secret
- **WHEN** the header is missing or does not match `WEBHOOK_SECRET_TOKEN`
- **THEN** the system SHALL respond with 401 (or 403) and SHALL NOT process the message nor write to the database

#### Scenario: No secret configured (local dev)
- **WHEN** `WEBHOOK_SECRET_TOKEN` is not set
- **THEN** the system SHALL skip verification (allow all) to ease local testing and SHALL log a warning

### Requirement: Chat allowlist

The system SHALL enforce `ALLOWED_CHAT_ID` when defined: only messages whose `chat.id` equals the allowed value are processed; otherwise it SHALL ignore the message. When `ALLOWED_CHAT_ID` is not defined, it SHALL allow any chat (for testing).

#### Scenario: Allowed chat
- **WHEN** `ALLOWED_CHAT_ID=23283738478` and Update has `chat.id=23283738478`
- **THEN** the system SHALL process the command normally

#### Scenario: Disallowed chat
- **WHEN** `ALLOWED_CHAT_ID` is set and Update has a different `chat.id`
- **THEN** the system SHALL return 200 to Telegram, SHALL NOT persist anything, and SHALL optionally reply "No autorizado" via `sendMessage`

#### Scenario: Open mode for tests
- **WHEN** `ALLOWED_CHAT_ID` is unset or empty
- **THEN** the system SHALL accept messages from any `chat.id`

### Requirement: Idempotent deduplication via MENSAJES

The system SHALL deduplicate Telegram retries using table `MENSAJES` with `PRIMARY KEY(MENSAJE_TG_ID, CHAT_TG_ID)` and foreign key `MENSAJES.GASTO_ID -> GASTOS.GASTO_ID`. A second delivery of the same `(chat.id, message_id)` SHALL NOT create a second `GASTOS` row.

#### Scenario: First delivery persists
- **WHEN** a message with `(chat_tg_id=23283738478, mensaje_tg_id=87987978)` arrives first time and `/save` is valid
- **THEN** the system SHALL insert one `GASTOS` row and one `MENSAJES` row linking them

#### Scenario: Retry is deduplicated
- **WHEN** Telegram retries the same `(chat_tg_id, mensaje_tg_id)` due to timeout
- **THEN** the system SHALL detect the existing `MENSAJES` row (PK violation or SELECT), SHALL NOT insert a new `GASTOS`, SHALL rollback any partial inserts, and SHALL reply "Ya registrado" or equivalent and return 200

#### Scenario: Different messages are distinct
- **WHEN** two Updates have same `mensaje_tg_id` but different `chat_tg_id`
- **THEN** the system SHALL treat them as distinct (composite PK allows both)

### Requirement: Telegram reply via Bot API

The system SHALL reply to the originating chat via Telegram Bot API `sendMessage` using `BOT_TOKEN` (wrangler secret), formatting success and error messages.

#### Scenario: Successful save reply
- **WHEN** `/save` is valid and persisted
- **THEN** the system SHALL call `https://api.telegram.org/bot<BOT_TOKEN>/sendMessage` with `chat_id` and text containing monto, tags and descripcion (e.g., `Guardado: 5000.00 #TDC`)

#### Scenario: Bot API failure does not duplicate data
- **WHEN** `sendMessage` fails (network error)
- **THEN** the system SHALL have already committed the transaction and SHALL return 200 to Telegram; failure to reply SHALL NOT rollback the persisted gasto

#### Scenario: Invalid command reply
- **WHEN** message is not `/save` or fails validation
- **THEN** the system SHALL reply with a help/error text (e.g., `Uso: /save <monto> [#tag ...] [descripcion]`) and SHALL NOT persist

### Requirement: Env and binding configuration

The system SHALL read `BOT_TOKEN`, `WEBHOOK_SECRET_TOKEN`, `ALLOWED_CHAT_ID` (optional) from `env` via `src/config.ts` using `c.env` (Hono `CloudflareBindings`), and SHALL use D1 binding `DB` for persistence. Missing required secrets SHALL cause a 500 with a clear log.

#### Scenario: Missing BOT_TOKEN
- **WHEN** `BOT_TOKEN` is not set
- **THEN** the system SHALL log an error and return 500 for webhook calls that need to reply, without crashing the Worker
