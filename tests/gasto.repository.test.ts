import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDbWithBetterSqlite } from './helpers'
import { saveGasto } from '../src/repositories/gasto.repository'
import type { Kysely } from 'kysely'
import type { Database } from '../src/db/types'

describe('gasto.repository', () => {
  let db: Kysely<Database>

  beforeEach(() => {
    const { db: testDb } = createTestDbWithBetterSqlite()
    db = testDb
  })

  it('successful persistence with tags and mensaje', async () => {
    const res = await saveGasto(db, {
      monto: 6000,
      descripcion: 'Gasto del costco',
      tags: ['TDC', 'BMEX'],
      mensaje_tg_id: 87987978,
      chat_tg_id: 23283738478,
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.gasto_id).toBeGreaterThan(0)

    const gastos = await db.selectFrom('gastos').selectAll().execute()
    expect(gastos.length).toBe(1)
    expect(gastos[0].monto).toBe(6000)

    const etiquetas = await db.selectFrom('etiquetas').selectAll().execute()
    expect(etiquetas.length).toBe(2)

    const links = await db.selectFrom('etiquetas_gastos').selectAll().execute()
    expect(links.length).toBe(2)

    const mensajes = await db.selectFrom('mensajes').selectAll().execute()
    expect(mensajes.length).toBe(1)
    expect(mensajes[0].mensaje_tg_id).toBe(87987978)
  })

  it('transaction atomicity on duplicate mensaje', async () => {
    const first = await saveGasto(db, {
      monto: 100,
      descripcion: 'first',
      tags: ['TDC'],
      mensaje_tg_id: 1,
      chat_tg_id: 1,
    })
    expect(first.ok).toBe(true)

    const second = await saveGasto(db, {
      monto: 200,
      descripcion: 'second',
      tags: ['BMEX'],
      mensaje_tg_id: 1,
      chat_tg_id: 1,
    })
    expect(second.ok).toBe(false)
    expect((second as any).reason).toBe('duplicate')

    const gastos = await db.selectFrom('gastos').selectAll().execute()
    expect(gastos.length).toBe(1) // no orphan
  })

  it('different chat with same mensaje_tg_id are distinct', async () => {
    await saveGasto(db, { monto: 10, descripcion: '', tags: [], mensaje_tg_id: 1, chat_tg_id: 1 })
    const second = await saveGasto(db, { monto: 20, descripcion: '', tags: [], mensaje_tg_id: 1, chat_tg_id: 2 })
    expect(second.ok).toBe(true)
    const gastos = await db.selectFrom('gastos').selectAll().execute()
    expect(gastos.length).toBe(2)
  })

  it('tag uniqueness reused', async () => {
    await saveGasto(db, { monto: 10, descripcion: '', tags: ['TDC'], mensaje_tg_id: 1, chat_tg_id: 1 })
    await saveGasto(db, { monto: 20, descripcion: '', tags: ['tdc'], mensaje_tg_id: 2, chat_tg_id: 1 })
    const etiquetas = await db.selectFrom('etiquetas').selectAll().execute()
    expect(etiquetas.length).toBe(1)
    expect(etiquetas[0].etiqueta).toBe('TDC')
    const links = await db.selectFrom('etiquetas_gastos').selectAll().execute()
    expect(links.length).toBe(2)
  })

  it('save without tags', async () => {
    const res = await saveGasto(db, { monto: 5000, descripcion: 'Solo descripcion', tags: [], mensaje_tg_id: 10, chat_tg_id: 10 })
    expect(res.ok).toBe(true)
    const links = await db.selectFrom('etiquetas_gastos').selectAll().execute()
    expect(links.length).toBe(0)
  })
})
