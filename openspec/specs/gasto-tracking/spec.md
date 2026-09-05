## Purpose

Registra gastos desde Telegram con el comando /save, parseando monto, etiquetas y descripcion con reglas deterministas y persistiendo de forma transaccional en D1 via Kysely.

## Requirements

### Requirement: /save command grammar

The system SHALL support command `/save` where the first token after the command MUST be a monto decimal `> 0` without commas or symbols (`^\d+(\.\d+)?$`), followed by zero or more tags and a free-form descripcion; tags may appear in any position after the monto and descripcion is the remainder after removing monto and valid tags.

#### Scenario: Valid with tags and descripcion
- **WHEN** user sends `/save 5000.00 #tdc #otro-mas Gasto otro`
- **THEN** the system SHALL parse `monto=5000.00`, `tags=["TDC","OTRO-MAS"]`, `descripcion="Gasto otro"`

#### Scenario: Valid with tags interleaved and numbers in descripcion
- **WHEN** user sends `/save 5000 Este es otro #tdc #otro-mas que ayuda 999`
- **THEN** the system SHALL parse `monto=5000`, `tags=["TDC","OTRO-MAS"]`, `descripcion="Este es otro que ayuda 999"`

#### Scenario: Valid without tags
- **WHEN** user sends `/save 6000.00 Gasto del costco`
- **THEN** the system SHALL parse `monto=6000.00`, `tags=[]`, `descripcion="Gasto del costco"`

#### Scenario: Valid without descripcion
- **WHEN** user sends `/save 6000.00 #tdc #bmex`
- **THEN** the system SHALL parse `monto=6000.00`, `tags=["TDC","BMEX"]`, `descripcion=""` (empty string stored as TEXT)

### Requirement: Monto validation

The system SHALL validate that the monto token exists, matches `^\d+(\.\d+)?$`, is `> 0`, contains no commas or symbols, and SHALL reject the message otherwise.

#### Scenario: Monto missing
- **WHEN** user sends `/save  Este es otro #tdc #otro-mas que ayuda 9000`
- **THEN** the system SHALL reject as invalid, SHALL NOT persist, and SHALL reply with usage error

#### Scenario: Monto not in first position
- **WHEN** user sends `/save #tdc #otro-mas que ayuda 9000.00`
- **THEN** the system SHALL reject as invalid (monto must be token 1 after command), SHALL NOT persist, and SHALL reply with usage error

#### Scenario: Monto zero or negative or comma
- **WHEN** user sends `/save 0 #tdc test` or `/save -5 #tdc test` or `/save 6,000.00 #tdc test`
- **THEN** the system SHALL reject as invalid (zero/negative/comma not allowed), SHALL NOT persist

#### Scenario: Monto decimal valid
- **WHEN** user sends `/save 6000.50 #tdc test`
- **THEN** the system SHALL accept and store `monto=6000.50` as REAL

### Requirement: Etiqueta extraction and normalization

The system SHALL extract every token matching `#([A-Za-z0-9]+(-[A-Za-z0-9]+)*)` as a tag (hash + alphanum words separated by single hyphens), normalize to uppercase, deduplicate case-insensitively, and SHALL treat any other `#...` token as part of descripcion. Tags SHALL be stored in `ETIQUETAS` with `UNIQUE(etiqueta)` on the uppercased value.

#### Scenario: Hyphen as separator
- **WHEN** message contains `#otro-mas`
- **THEN** the system SHALL extract tag `OTRO-MAS`

#### Scenario: Case insensitivity and deduplication
- **WHEN** message contains `#tdc #TDC #Tdc`
- **THEN** the system SHALL store a single `TDC` tag and link it once to the gasto

#### Scenario: Invalid tag falls back to descripcion
- **WHEN** message contains `#tdc!` or `#-hola` or `#otro--mas` or `#,abc`
- **THEN** the system SHALL NOT treat it as a tag; the literal `#tdc!` remains in `descripcion`

#### Scenario: Tag uniqueness in DB
- **WHEN** two different gastos use `#tdc`
- **THEN** `ETIQUETAS` SHALL contain one row `TDC` and `ETIQUETAS_GASTOS` SHALL have two link rows referencing it

#### Scenario: Numeric tag
- **WHEN** message contains `#123`
- **THEN** the system SHALL treat it as valid tag `123` (digits are allowed)

### Requirement: Descripcion extraction

The system SHALL construct `descripcion` by joining all tokens after the monto that are not valid tags, preserving original order, space-separated, trimmed; if no such tokens remain, descripcion SHALL be empty string.

#### Scenario: Descripcion preserves numbers and symbols
- **WHEN** message is `/save 5000 Este es otro #tdc #otro-mas que ayuda 999`
- **THEN** `descripcion` SHALL be `Este es otro que ayuda 999` (tags removed, `999` kept)

#### Scenario: Descripcion containing hash-like invalid tag
- **WHEN** message is `/save 5000 Gasto #tdc! en tienda`
- **THEN** `descripcion` SHALL be `Gasto #tdc! en tienda`

### Requirement: Persistence model and constraints

The system SHALL persist via Kysely + D1 (no Drizzle) to tables: `GASTOS(gasto_id PK AI, monto REAL CHECK(monto>0), descripcion TEXT, creado DATETIME DEFAULT CURRENT_TIMESTAMP, modificado DATETIME DEFAULT CURRENT_TIMESTAMP)`, `ETIQUETAS(etiqueta_id PK AI, etiqueta TEXT UNIQUE)`, `ETIQUETAS_GASTOS(etiqueta_id FK, gasto_id FK, PRIMARY KEY(etiqueta_id, gasto_id) or id AI)` and `MENSAJES(gasto_id FK -> GASTOS, mensaje_tg_id INTEGER, chat_tg_id INTEGER, PRIMARY KEY(mensaje_tg_id, chat_tg_id))`.

#### Scenario: Successful persistence
- **WHEN** `/save 6000.00 #tdc #bmex Gasto del costco` with `(chat_tg_id=23283738478, mensaje_tg_id=87987978)` is processed
- **THEN** the system SHALL insert `GASTOS(monto=6000.00, descripcion="Gasto del costco")`, ensure `ETIQUETAS` rows `TDC` and `BMEX` exist, insert two `ETIQUETAS_GASTOS` links, and insert `MENSAJES(gasto_id, 87987978, 23283738478)` in a single transaction

#### Scenario: Transaction atomicity
- **WHEN** any insert after `GASTOS` fails (e.g., `MENSAJES` PK violation due to retry)
- **THEN** the entire transaction SHALL rollback (no orphan `GASTOS` or `ETIQUETAS_GASTOS` remains)

#### Scenario: Timestamps
- **WHEN** a `GASTOS` row is inserted without explicit `creado`/`modificado`
- **THEN** the DB SHALL default both to current timestamp via `DEFAULT CURRENT_TIMESTAMP`

### Requirement: No-tag and single-user scope

The system SHALL allow `/save` without any tags, and SHALL operate for a single user or group (no per-user accounts); `GASTOS` does not store `chat_id` directly, provenance is via `MENSAJES`.

#### Scenario: Save without tags persists
- **WHEN** user sends `/save 5000 Solo descripcion`
- **THEN** the system SHALL persist with zero `ETIQUETAS_GASTOS` rows linked

#### Scenario: Single chat scope
- **WHEN** the bot is used from the single allowed chat/group
- **THEN** all gastos SHALL be retrievable via join to `MENSAJES` filtered by `chat_tg_id` if needed (no multi-tenant isolation required)
