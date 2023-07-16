/**
 * A set of functions that represent different tasks
 * in the lifecycle of a gyros() call
 */

import type { AstNode, Context, SyncResult } from '../gyros.js'
import * as helpers from './helpers.js'
import { checkNode, finishedNodes, nodeMetadataStore } from './metadata.js'
import { isNode, isPromise } from './util.js'

type Helpers = typeof helpers
type HelperName = keyof Helpers

// May or may not receive the `node` parameter
type VariadicHelper<T extends (...args: any[]) => any> = T extends (
  node: AstNode,
  ...args: infer U
) => infer R
  ? T | ((...args: U) => R)
  : never

/**
 * Collect the child AST nodes of a node
 *
 * @param node The node to search for child nodes
 */
export function collectChildNodes(node: AstNode) {
  const childNodes: AstNode[] = []

  // Walk all AST node properties, performing a recursive `walk`
  // on everything that looks like another AST node
  for (const key of Object.keys(node)) {
    const property = node[key as keyof AstNode]

    if (Array.isArray(property)) {
      // Step into arrays and walk their items
      for (const propertyElement of property) {
        if (isNode(propertyElement)) {
          childNodes.push(propertyElement)
        }
      }
    } else if (isNode(property)) {
      childNodes.push(property)
    }
  }

  return childNodes
}

/**
 * Perform node handling on child nodes in succession
 * This function returns a promise if any of the executed manipulators
 * returns a promise, otherwise it executes synchronously
 *
 * @param node       The node whose child nodes to handle
 * @param childNodes The child nodes to handle
 */
export function performSuccessiveRecursiveWalks<T>(
  node: AstNode,
  childNodes: AstNode[],
  context: Context<T>
): T {
  // Return synchronously when no subwalks are scheduled
  if (childNodes.length === 0) {
    return undefined as any
  }

  const [firstChild, ...remainingChildNodes] = childNodes

  const subwalkResult = handleNode(firstChild, context)

  // When node handling returns a promise, an asynchronous manipulator was called
  // -> wait for it to resolve, then handle next step
  if (isPromise(subwalkResult)) {
    return subwalkResult.then(() =>
      performSuccessiveRecursiveWalks(node, remainingChildNodes, context)
    ) as any
  } else {
    return performSuccessiveRecursiveWalks(node, remainingChildNodes, context)
  }
}

/**
 * Collect metadata of a tree
 *
 * @param node    The starting node of the tree
 * @param context The gyros() context
 */
export function collectTreeMetadata<T>(node: AstNode, context: Context<T>) {
  const childNodes = collectChildNodes(node)

  for (const childNode of childNodes) {
    nodeMetadataStore.set(childNode, { parent: node, context })

    collectTreeMetadata(childNode, context)
  }
}

/**
 * Create a function that handles any of the NodeMetadata methods,
 * taking into account a node as an optional first parameter.
 *
 * @param node       The node to bind to the helper method
 * @param helperName The the helper function to invoke
 */
function createNodeHelper<U extends HelperName>(node: AstNode, helperName: U) {
  return (...args: Parameters<VariadicHelper<Helpers[U]>>) => {
    // We need to annihilate typing because TS is just not clever enough
    const helper = helpers[helperName] as any

    if (isNode(args[0])) {
      if (helperName === 'update') {
        checkNode(args[0])
      }

      // If first argument is not a node, grab its metadata from
      // the store and execute the according method on that
      return helper(...args)
    } else {
      return helper(node, ...args)
    }
  }
}

/**
 * Walk the AST under the given node and update its descendants
 *
 * @param node    The AST node to start at
 * @param context The gyros() context
 */
export function handleNode<T>(node: AstNode, context: Context<T>) {
  // Get subwalks to perform
  const childNodes = collectChildNodes(node)
  const subwalksResult = performSuccessiveRecursiveWalks(
    node,
    childNodes,
    context
  )

  // Create the manipulation helpers object
  const nodeHelpers = {
    source: createNodeHelper(node, 'source'),
    parent: createNodeHelper(node, 'parent'),
    update: createNodeHelper(node, 'update')
  }

  // Call manipulator function on AST node
  if (isPromise(subwalksResult)) {
    return subwalksResult
      .then(() => {
        return context.manipulator(node, nodeHelpers)
      })
      .then(manipulatorResult => {
        finishedNodes.add(node)
        return manipulatorResult
      })
  } else {
    const manipulatorResult = context.manipulator(node, nodeHelpers)

    if (isPromise(manipulatorResult)) {
      return manipulatorResult.then(result => {
        finishedNodes.add(node)
        return result
      })
    } else {
      finishedNodes.add(node)
      return manipulatorResult
    }
  }
}

/**
 * Create an immutable gyros() result
 *
 * @param context The gyros() context
 */
export function createResult<T>({
  magicString,
  options
}: Context<T>): SyncResult {
  const code = magicString.toString()

  return Object.freeze({
    code,
    map: magicString.generateMap(options.sourceMap),
    toString: () => code
  })
}
