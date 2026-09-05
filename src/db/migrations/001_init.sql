-- Migration 001: gastos, etiquetas, etiquetas_gastos, mensajes

CREATE TABLE IF NOT EXISTS gastos (
  gasto_id INTEGER PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  modificado TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS etiquetas (
  etiqueta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  etiqueta TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS etiquetas_gastos (
  etiqueta_id INTEGER NOT NULL,
  gasto_id INTEGER NOT NULL,
  PRIMARY KEY (etiqueta_id, gasto_id),
  FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(etiqueta_id) ON DELETE CASCADE,
  FOREIGN KEY (gasto_id) REFERENCES gastos(gasto_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensajes (
  gasto_id INTEGER NOT NULL,
  mensaje_tg_id INTEGER NOT NULL,
  chat_tg_id INTEGER NOT NULL,
  PRIMARY KEY (mensaje_tg_id, chat_tg_id),
  FOREIGN KEY (gasto_id) REFERENCES gastos(gasto_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mensajes_gasto_id ON mensajes(gasto_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_gastos_gasto ON etiquetas_gastos(gasto_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_gastos_etiqueta ON etiquetas_gastos(etiqueta_id);
