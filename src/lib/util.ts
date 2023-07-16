/**
 * Utilities that are completely independent of how Gyros works
 */

import type { AstNode } from '../gyros.js'

/**
 * Union any type with `undefined`
 */
export type Maybe<T> = T | undefined

/**
 * Check whether a variable is a Promise
 *
 * @param value The value to check
 */
export function isPromise<T = any>(value: any): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.then === 'function'
  )
}

/**
 * Check whether a value resembles an acorn AST node
 *
 * @param value The value to check
 */
export function isNode(value: any): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.kind === 'string'
  )
}
