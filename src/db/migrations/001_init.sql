-- Migration 001: my_gastos, my_etiquetas, my_etiquetas_gastos, my_tg_mensajes

CREATE TABLE IF NOT EXISTS my_gastos (
  gasto_id INTEGER PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  modificado TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS my_etiquetas (
  etiqueta_id INTEGER PRIMARY KEY AUTOINCREMENT,
  etiqueta TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS my_etiquetas_gastos (
  etiqueta_id INTEGER NOT NULL,
  gasto_id INTEGER NOT NULL,
  PRIMARY KEY (etiqueta_id, gasto_id),
  FOREIGN KEY (etiqueta_id) REFERENCES my_etiquetas(etiqueta_id) ON DELETE CASCADE,
  FOREIGN KEY (gasto_id) REFERENCES my_gastos(gasto_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS my_tg_mensajes (
  gasto_id INTEGER NOT NULL,
  mensaje_tg_id INTEGER NOT NULL,
  chat_tg_id INTEGER NOT NULL,
  PRIMARY KEY (mensaje_tg_id, chat_tg_id),
  FOREIGN KEY (gasto_id) REFERENCES my_gastos(gasto_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_my_tg_mensajes_gasto_id ON my_tg_mensajes(gasto_id);
CREATE INDEX IF NOT EXISTS idx_my_etiquetas_gastos_gasto ON my_etiquetas_gastos(gasto_id);
CREATE INDEX IF NOT EXISTS idx_my_etiquetas_gastos_etiqueta ON my_etiquetas_gastos(etiqueta_id);
