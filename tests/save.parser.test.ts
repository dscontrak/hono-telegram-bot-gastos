import { describe, it, expect } from 'vitest'
import { parseSave } from '../src/commands/save.parser'

describe('parseSave', () => {
  it('valid with tags and descripcion', () => {
    const r = parseSave('/save 5000.00 #tdc #otro-mas Gasto otro')
    expect(r).toEqual({ monto: 5000, tags: ['TDC', 'OTRO-MAS'], descripcion: 'Gasto otro' })
  })

  it('valid with tags interleaved and numbers in descripcion', () => {
    const r = parseSave('/save 5000 Este es otro #tdc #otro-mas que ayuda 999')
    expect(r).toEqual({ monto: 5000, tags: ['TDC', 'OTRO-MAS'], descripcion: 'Este es otro que ayuda 999' })
  })

  it('valid without tags', () => {
    const r = parseSave('/save 6000.00 Gasto del costco')
    expect(r).toEqual({ monto: 6000, tags: [], descripcion: 'Gasto del costco' })
  })

  it('valid without descripcion', () => {
    const r = parseSave('/save 6000.00 #tdc #bmex')
    expect(r).toEqual({ monto: 6000, tags: ['TDC', 'BMEX'], descripcion: '' })
  })

  it('monto missing', () => {
    const r = parseSave('/save  Este es otro #tdc #otro-mas que ayuda 9000')
    expect(r).toHaveProperty('error')
  })

  it('monto not in first position', () => {
    const r = parseSave('/save #tdc #otro-mas que ayuda 9000.00')
    expect(r).toHaveProperty('error')
  })

  it('monto zero or negative or comma', () => {
    expect(parseSave('/save 0 #tdc test')).toHaveProperty('error')
    expect(parseSave('/save -5 #tdc test')).toHaveProperty('error')
    expect(parseSave('/save 6,000.00 #tdc test')).toHaveProperty('error')
  })

  it('monto decimal valid', () => {
    const r = parseSave('/save 6000.50 #tdc test')
    expect(r).toEqual({ monto: 6000.5, tags: ['TDC'], descripcion: 'test' })
  })

  it('hyphen as separator', () => {
    const r = parseSave('/save 5000 #otro-mas test')
    expect(r).toHaveProperty('tags')
    expect((r as any).tags).toContain('OTRO-MAS')
  })

  it('case insensitivity and deduplication', () => {
    const r = parseSave('/save 5000 #tdc #TDC #Tdc test')
    expect(r).toEqual({ monto: 5000, tags: ['TDC'], descripcion: 'test' })
  })

  it('invalid tag fallback to descripcion', () => {
    for (const bad of ['#tdc!', '#-hola', '#otro--mas', '#,abc']) {
      const r = parseSave(`/save 5000 Gasto ${bad} en tienda`) as any
      expect(r.tags).toEqual([])
      expect(r.descripcion).toContain(bad)
    }
  })

  it('numeric tag', () => {
    const r = parseSave('/save 5000 #123 test') as any
    expect(r.tags).toEqual(['123'])
  })

  it('descripcion preserves numbers', () => {
    const r = parseSave('/save 5000 Este es otro #tdc #otro-mas que ayuda 999') as any
    expect(r.descripcion).toBe('Este es otro que ayuda 999')
  })

  it('descripcion containing hash-like invalid tag', () => {
    const r = parseSave('/save 5000 Gasto #tdc! en tienda') as any
    expect(r.descripcion).toBe('Gasto #tdc! en tienda')
  })
})
