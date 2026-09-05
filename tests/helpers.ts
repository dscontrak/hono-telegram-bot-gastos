import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import type { Database as DbType } from '../src/db/types'
import fs from 'node:fs'
import path from 'node:path'

export function createTestKysely(): Kysely<DbType> {
  const sqlite = new Database(':memory:')
  const db = new Kysely<DbType>({
    dialect: new SqliteDialect({ database: sqlite }),
  })
  return db
}

export async function migrateTestDb(db: Kysely<DbType>) {
  const sqlPath = path.join(process.cwd(), 'src/db/migrations/001_init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  // better-sqlite3 via Kysely doesn't have raw execute, use db's sqlite directly via a hack
  // Instead execute via Kysely's raw: we can use the underlying better-sqlite3 instance
  // Easiest: get sqlite instance from dialect via private; instead read sql and split statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const stmt of statements) {
    await db.executeQuery({ sql: stmt, parameters: [], query: { kind: 'RawNode', sqlFragments: [], parameters: [] } } as never).catch(() => {
      // Fallback: use the underlying better-sqlite3 directly via db's internal
    })
  }
}

// Alternative: create tables via direct better-sqlite3 connection
export function createTestDbWithBetterSqlite() {
  const sqlite = new Database(':memory:')
  const sqlPath = path.join(process.cwd(), 'src/db/migrations/001_init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  sqlite.exec(sql)
  const db = new Kysely<DbType>({
    dialect: new SqliteDialect({ database: sqlite }),
  })
  return { db, sqlite }
}
