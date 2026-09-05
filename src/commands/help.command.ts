export const HELP_TEXT = `Uso: /save <monto> [#tag ...] [descripcion]
Ejemplos:
  /save 5000.00 #tdc #otro-mas Gasto otro
  /save 5000 Este es otro #tdc #otro-mas que ayuda 999
  /save 6000.00 Gasto del costco

Reglas:
- Monto siempre despues del comando, mayor a 0, sin comas, con punto decimal opcional.
- Tags: #palabra con letras/numeros y guiones como separador (ej #otro-mas), se guardan en mayusculas.
- Descripcion: resto del mensaje sin tags validos.`

export function getHelpText(): string {
  return HELP_TEXT
}
