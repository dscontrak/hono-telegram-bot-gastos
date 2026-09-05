export type ParseSaveSuccess = {
  monto: number
  tags: string[]
  descripcion: string
}

export type ParseSaveError = {
  error: string
}

export type ParseSaveResult = ParseSaveSuccess | ParseSaveError

const MONTO_REGEX = /^\d+(\.\d+)?$/
const TAG_REGEX = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/

function isValidTagBody(body: string): boolean {
  return TAG_REGEX.test(body)
}

export function parseSave(text: string): ParseSaveResult {
  const trimmed = text.trim()
  // Must start with /save
  if (!trimmed.startsWith('/save')) {
    return { error: 'Comando debe empezar con /save. Uso: /save <monto> [#tag ...] [descripcion]' }
  }

  const after = trimmed.slice(5).trim() // remove '/save'
  if (!after) {
    return { error: 'Monto requerido. Uso: /save <monto> [#tag ...] [descripcion]' }
  }

  const tokens = after.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return { error: 'Monto requerido. Uso: /save <monto> [#tag ...] [descripcion]' }
  }

  const montoStr = tokens[0]
  if (!MONTO_REGEX.test(montoStr)) {
    return { error: `Monto invalido "${montoStr}". Debe ser numero > 0 sin comas, ej: 6000.00` }
  }
  const monto = Number(montoStr)
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: 'Monto debe ser mayor a cero' }
  }

  const restTokens = tokens.slice(1)

  const tags: string[] = []
  const descripcionParts: string[] = []
  const seenTags = new Set<string>()

  for (const token of restTokens) {
    if (token.startsWith('#') && token.length > 1) {
      const body = token.slice(1)
      if (isValidTagBody(body)) {
        const upper = body.toUpperCase()
        if (!seenTags.has(upper)) {
          seenTags.add(upper)
          tags.push(upper)
        }
        continue
      }
    }
    descripcionParts.push(token)
  }

  const descripcion = descripcionParts.join(' ').trim()

  return { monto, tags, descripcion }
}

export function isParseSaveSuccess(r: ParseSaveResult): r is ParseSaveSuccess {
  return (r as ParseSaveSuccess).monto !== undefined
}
