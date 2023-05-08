import { test, expect } from 'vitest'
import { gyros } from '../src/gyros.js'

test('should expose node helpers', () => {
  expect.assertions(11)

  const output = gyros('$x + $y', (node, { source, parent }) => {
    expect(gyros.source(node)).toBe(source())
    expect(gyros.parent(node)).toBe(parent())

    if (node.kind === 'variable') {
      gyros.update(node, '$z')
    }
  })

  expect(output.code).toBe('$z + $z')
})
