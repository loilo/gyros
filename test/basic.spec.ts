import { it, test, expect } from 'vitest'
import { gyros } from '../src/gyros.js'

it('should pass the base test', async () => {
  const { src, validate } = (await import('./base-test.js')).arrayBase(3)

  const output = gyros(src, (node, { update, source }) => {
    if (node.kind === 'array') {
      update(`fun(${source()})`)
    }
  })

  expect(typeof output).toBe('object')
  expect(output).not.toBeNull()
  expect(output.code).toBe(output.toString())

  validate(output.toString())
})

test('source() should return replaced content', () => {
  expect.assertions(3)

  const result = gyros('$x + $y', (node, { source, update, parent }) => {
    if (node.kind === 'variable') {
      if (node.name === 'x') {
        expect(source(parent(node)?.right)).toBe('$y')
        update(parent(node)?.right, '$z')
      } else {
        expect(source(node)).toBe('$z')
      }
    }
  })

  expect(result.toString()).toBe('$x + $z')
})

it('should allow for multiple overrides on the same node', () => {
  expect.assertions(1)

  const result = gyros('$x + $y', (node, { update, parent }) => {
    if (node.kind === 'variable') {
      if (node.name === 'x') {
        update(parent(node)?.right, '$z')
      } else {
        update('$z2')
      }
    }
  })

  expect(result.toString()).toBe('$x + $z2')
})
