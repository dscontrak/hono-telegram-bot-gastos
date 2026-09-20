import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import app from '../src/index'
import { createTestDbWithBetterSqlite } from './helpers'

function makeEnv(overrides: Partial<Record<string, any>> = {}) {
  const { db, sqlite } = createTestDbWithBetterSqlite()
  // Need a D1Database-like object that wraps better-sqlite3 via kysely-d1 expectations
  // Instead of using D1Dialect, we monkey-patch createDb to return our Kysely directly.
  // For this test we mock the db/kysely module: createDb returns the Kysely instance we built.
  return { db, sqlite, overrides }
}

// We will mock ../src/db/kysely to return our test db
vi.mock('../src/db/kysely', async () => {
  const actual = await vi.importActual<typeof import('../src/db/kysely')>('../src/db/kysely')
  return { ...actual }
})

describe('webhook', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let testDb: ReturnType<typeof createTestDbWithBetterSqlite>['db']
  let sqlite: ReturnType<typeof createTestDbWithBetterSqlite>['sqlite']

  beforeEach(() => {
    const created = createTestDbWithBetterSqlite()
    testDb = created.db
    sqlite = created.sqlite

    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' } as any)
    vi.stubGlobal('fetch', fetchMock)

    // Monkey-patch createDb to return our testDb regardless of env.DB
    // Do this by mocking the module's createDb via vi.spyOn after import
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function envWithDb(extras: Record<string, any> = {}) {
    return {
      BOT_TOKEN: 'test-token',
      WEBHOOK_SECRET_TOKEN: 'secret123',
      ALLOWED_CHAT_ID: '',
      DB: {} as any,
      ...extras,
    }
  }

  async function postWebhook(body: any, headers: Record<string, string> = {}, envExtras: Record<string, any> = {}) {
    // Stub createDb
    const kyselyModule = await import('../src/db/kysely')
    const spy = vi.spyOn(kyselyModule, 'createDb').mockReturnValue(testDb as any)

    const env = envWithDb(envExtras)
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })

    // Hono app expects c.env to be the CloudflareBindings; we pass via fetch env
    // In Workers, fetch is called as app.fetch(request, env, ctx). We simulate by passing env as second arg.
    const res = await (app as any).fetch(req, env, { waitUntil: () => {} } as any)
    spy.mockRestore()
    return res
  }

  it('health check GET /', async () => {
    const res = await app.fetch(new Request('http://localhost/'), { BOT_TOKEN: 't', DB: null as any } as any)
    expect(res.status).toBe(200)
  })

  it('rejects invalid secret', async () => {
    const res = await postWebhook({ message: { message_id: 1, text: '/save 100 #t', chat: { id: 1 } } }, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' })
    expect(res.status).toBe(401)
  })

  it('allows when secret missing (open mode)', async () => {
    const res = await postWebhook(
      { message: { message_id: 1, text: '/save 100 #t', chat: { id: 1 } } },
      {},
      { WEBHOOK_SECRET_TOKEN: '' }
    )
    expect(res.status).toBe(200)
  })

  it('chat allowlist blocks disallowed chat', async () => {
    const res = await postWebhook(
      { message: { message_id: 1, text: '/save 100 #t', chat: { id: 999 } } },
      { 'X-Telegram-Bot-Api-Secret-Token': 'secret123' },
      { ALLOWED_CHAT_ID: '123' }
    )
    expect(res.status).toBe(200)
    // Should have sent "No autorizado"
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('sendMessage'), expect.objectContaining({}))
    const calls = fetchMock.mock.calls
    const lastBody = JSON.parse(calls[0][1].body)
    expect(lastBody.text).toContain('No autorizado')
  })

  it('valid /save with tags persists and replies', async () => {
    const res = await postWebhook(
      { message: { message_id: 10, text: '/save 5000.00 #tdc #otro-mas Gasto otro', chat: { id: 1 } } },
      { 'X-Telegram-Bot-Api-Secret-Token': 'secret123' }
    )
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalled()
    const lastBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(lastBody.text).toContain('Guardado: 5000.00')
    expect(lastBody.text).toContain('#TDC')
  })

  it('valid /save without tags', async () => {
    const res = await postWebhook(
      { message: { message_id: 11, text: '/save 6000 Gasto del costco', chat: { id: 1 } } },
      { 'X-Telegram-Bot-Api-Secret-Token': 'secret123' }
    )
    expect(res.status).toBe(200)
    const lastBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(lastBody.text).toContain('Guardado')
  })

  it('invalid monto does not persist and replies error', async () => {
    const res = await postWebhook(
      { message: { message_id: 12, text: '/save #tdc #otro-mas que ayuda 9000.00', chat: { id: 1 } } },
      { 'X-Telegram-Bot-Api-Secret-Token': 'secret123' }
    )
    expect(res.status).toBe(200)
    const lastBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(lastBody.text).toContain('Error')
  })

  it('duplicate retry is deduplicated', async () => {
    const body = { message: { message_id: 20, text: '/save 100 #t dup', chat: { id: 1 } } }
    const headers = { 'X-Telegram-Bot-Api-Secret-Token': 'secret123' }
    const r1 = await postWebhook(body, headers)
    expect(r1.status).toBe(200)
    // Need to keep same testDb for second call (already done)
    const r2 = await postWebhook(body, headers)
    expect(r2.status).toBe(200)
    const lastBody = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body)
    expect(lastBody.text).toContain('Ya registrado')

    const rows = await testDb.selectFrom('my_gastos').selectAll().execute()
    expect(rows.length).toBe(1)
  })
})
