import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMessage, formatSaveSuccess } from '../src/services/telegram.service'

describe('telegram.service', () => {
  const env = { BOT_TOKEN: 'test-token', DB: null as any }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendMessage calls Telegram API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any)
    vi.stubGlobal('fetch', mockFetch)

    const res = await sendMessage(env, 123, 'Hola')
    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('https://api.telegram.org/bottest-token/sendMessage', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ chat_id: 123, text: 'Hola' }),
    }))
  })

  it('sendMessage handles failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad Request' } as any))
    const res = await sendMessage(env, 123, 'Hola')
    expect(res.ok).toBe(false)
  })

  it('formatSaveSuccess', () => {
    expect(formatSaveSuccess(5000, ['TDC', 'OTRO-MAS'], 'Gasto otro')).toBe('Guardado: 5000.00 #TDC #OTRO-MAS - Gasto otro')
    expect(formatSaveSuccess(6000, [], '')).toBe('Guardado: 6000.00')
  })
})
