import { Hono } from 'hono'
import type { Env } from './config'
import { telegramRoutes } from './routes/telegram.routes'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/', telegramRoutes)

export default app
