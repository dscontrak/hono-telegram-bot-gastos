## Purpose

Renames the database table from `my_mensajes` to `my_tg_mensajes` to better reflect that it stores Telegram messages and improve naming consistency.

## Requirements

### Requirement: Table name SHALL be my_tg_mensajes
The database table for storing Telegram messages SHALL be named `my_tg_mensajes` instead of `my_mensajes`.

#### Scenario: Migration creates renamed table
- **WHEN** the initial migration is executed
- **THEN** the table is created with the name `my_tg_mensajes`

### Requirement: TypeScript types SHALL match renamed table
The TypeScript interface definitions SHALL use `my_tg_mensajes` as the key in the Database interface.

#### Scenario: Type definitions use renamed table name
- **WHEN** the database types are imported
- **THEN** the Database interface contains key `my_tg_mensajes` instead of `my_mensajes`

### Requirement: Database queries SHALL use renamed table name
All SQL queries and Kysely operations SHALL reference `my_tg_mensajes` instead of `my_mensajes`.

#### Scenario: Query uses correct table name
- **WHEN** a query selects from the messages table
- **THEN** the query references `my_tg_mensajes` not `my_mensajes`
