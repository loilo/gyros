import { it, expect } from 'vitest'
import { gyros } from '../src/gyros.js'

it('should correctly access parent nodes', () => {
  expect.assertions(5)

  const src = `(function () {$xs = [ 1, 2, 3 ];fun($ys);})()`

  const output = gyros(src, (node, { source, parent, update }) => {
    if (node.kind === 'array') {
      expect(parent()?.kind).toBe('assign')
      expect(source(parent()!)).toBe('$xs = [ 1, 2, 3 ];')
      expect(parent(2)?.kind).toBe('expressionstatement')
      expect(source(parent(2)!)).toBe('$xs = [ 1, 2, 3 ];')
      update(parent()!, '$ys = 4;')
    }
  })

  Function(
    'fun',
    output.toString()
  )((x: any) => {
    expect(x).toBe(4)
  })
})

it('should correctly access and update arbitrary traversed nodes', () => {
  expect.assertions(3)

  const output = gyros('$x + $y', (node, { parent, source, update }) => {
    if (node.kind === 'variable' && node.name === 'x') {
      expect(parent()?.right.name).toBe('y')
      expect(source(parent()?.right)).toBe('$y')
      update(parent()?.right, '$z')
    }
  })

  expect(output.toString()).toBe('$x + $z')
})
