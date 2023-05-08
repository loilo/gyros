import { it, expect } from 'vitest'
import { AstNode, gyros } from '../src/gyros.js'

it('should pass the base test with a Buffer source', async () => {
  const { src, validate } = (await import('./base-test.js')).arrayBase()

  const output = gyros(Buffer.from(src), (node, { source, update }) => {
    if (node.kind === 'array') {
      update(`fun(${source()})`)
    }
  })

  validate(output.toString())
})

it('should use the correct parse mode', () => {
  const source = '<?= "Hello world" ?>'

  expect(() => gyros(source, { parseMode: 'code' }, () => {})).not.toThrow()

  expect(() => gyros(source, () => {})).toThrow()
})

it('should respect php-parser options', () => {
  const source = '$x + $y'

  function replacer(node: AstNode) {
    if (node.loc?.source == null) {
      throw new Error('Missing source')
    }
  }

  expect(() =>
    gyros(source, { phpParser: { ast: { withSource: true } } }, replacer)
  ).not.toThrow()

  expect(() =>
    gyros(source, { phpParser: { ast: { withSource: false } } }, replacer)
  ).toThrow()
})

it('should create a high-resolution source map', () => {
  const result = gyros(
    '$x + $y',
    { sourceMap: { hires: true } },
    (node, { update }) => {
      if (node.kind === 'variable' && node.name === 'y') {
        update('$z')
      }
    }
  )

  expect(result.map).toEqual({
    file: undefined,
    mappings: 'AAAA,CAAC,CAAC,CAAC,CAAC,CAAC',
    names: [],
    sources: [''],
    sourcesContent: undefined,
    version: 3
  })
})
