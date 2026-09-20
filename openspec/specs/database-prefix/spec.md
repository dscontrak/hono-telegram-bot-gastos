## Purpose

Ensures all database tables use the `my_` prefix for proper namespacing and to avoid naming conflicts when multiple services share the same database.

## Requirements

### Requirement: Table names SHALL use my_ prefix
All database tables SHALL be created with the `my_` prefix (e.g., `my_gastos`, `my_etiquetas`, `my_etiquetas_gastos`, `my_mensajes`).

#### Scenario: Migration creates prefixed tables
- **WHEN** the initial migration is executed
- **THEN** all four tables are created with `my_` prefix: `my_gastos`, `my_etiquetas`, `my_etiquetas_gastos`, `my_mensajes`

### Requirement: TypeScript types SHALL match table names
The TypeScript interface definitions SHALL use the prefixed table names as keys in the Database interface.

#### Scenario: Type definitions use prefixed names
- **WHEN** the database types are imported
- **THEN** the Database interface contains keys `my_gastos`, `my_etiquetas`, `my_etiquetas_gastos`, `my_mensajes`

### Requirement: Database queries SHALL use prefixed table names
All SQL queries and Kysely operations SHALL reference the prefixed table names.

#### Scenario: Query uses correct table name
- **WHEN** a query selects from the expenses table
- **THEN** the query references `my_gastos` not `gastos`
