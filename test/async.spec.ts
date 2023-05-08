import { it, expect } from 'vitest'
import { gyros } from '../src/gyros'

it('should correctly handle Promises returned from the manipulator', async () => {
  const { src, validate } = (await import('./base-test')).arrayBase()

  let pending = 0
  const output = await gyros(src, (node, { update, source }) => {
    if (node.kind === 'array') {
      return new Promise<void>(resolve => {
        pending++
        setTimeout(() => {
          update(`fun(${source()})`)
          pending--
          resolve()
        }, 50 * pending * 2)
      })
    }

    return
  })

  validate(output.toString())
})

it('should throw when update() is called after manipulator finished (sync)', async () => {
  expect.hasAssertions()

  await new Promise<void>(resolve => {
    setTimeout(resolve, 20)

    gyros('(false)', (_, { update }) => {
      setTimeout(() => {
        expect(() => {
          update('true')
        }).toThrowError()
      }, 10)
    })
  })
})

it("should throw when update() is called after iterated node's manipulator finished (async)", async () => {
  expect.hasAssertions()

  await gyros('(false)', (node, { update }) => {
    if (node.kind === 'boolean') {
      setTimeout(() => {
        expect(() => {
          update('true')
        }).toThrowError()
      }, 10)
    }

    return Promise.resolve()
  })

  await new Promise(resolve => setTimeout(resolve, 20))
})

it("should throw when update() is called after target node's manipulator finished", () => {
  expect.hasAssertions()

  gyros('(false)', (node, { update }) => {
    if (node.kind === 'expressionstatement') {
      expect(() => {
        update((node as any).expression, '(true)')
      }).toThrowError()
    }
  })
})
