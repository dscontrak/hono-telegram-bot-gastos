import type { Generated } from 'kysely'

export interface Gastos {
  gasto_id: Generated<number>
  monto: number
  descripcion: string
  creado: Generated<string>
  modificado: Generated<string>
}

export interface Etiquetas {
  etiqueta_id: Generated<number>
  etiqueta: string
}

export interface EtiquetasGastos {
  etiqueta_id: number
  gasto_id: number
}

export interface Mensajes {
  gasto_id: number
  mensaje_tg_id: number
  chat_tg_id: number
}

export interface Database {
  my_gastos: Gastos
  my_etiquetas: Etiquetas
  my_etiquetas_gastos: EtiquetasGastos
  my_tg_mensajes: Mensajes
}
