import { Hono } from 'hono'
import type { Env } from '../config'
import { handleWebhook } from '../controllers/telegram.controller'

export const telegramRoutes = new Hono<{ Bindings: Env }>()

telegramRoutes.post('/webhook', handleWebhook)
