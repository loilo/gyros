import parser, { type Node } from 'php-parser'
const Engine = parser.Engine

import MagicString, { SourceMap, SourceMapOptions } from 'magic-string'
import {
  collectTreeMetadata,
  createResult,
  handleNode
} from './lib/lifecycle.js'
import * as helpers from './lib/helpers.js'
import { nodeMetadataStore } from './lib/metadata.js'
import { isPromise, Maybe } from './lib/util.js'

export interface AstNode extends Node {
  [key: string]: any
}

/**
 * Options passable to Gyros
 */
export interface Options {
  phpParser?: any
  parseMode?: 'code' | 'eval'
  sourceMap?: SourceMapOptions
}

/**
 * Get the source code of the current node
 */
declare function SourceHelper(): string

/**
 * Get the source code of the provided node
 *
 * @param node The node whose source code to get
 */
declare function SourceHelper(node: AstNode): string

/**
 * Get the parent node of the current node
 *
 * @param levels The number of ancestor levels to climb
 */
declare function ParentHelper(levels?: number): Maybe<AstNode>

/**
 * Get the parent node of the provided node
 *
 * @param node   The node whose parent node to get
 * @param levels The number of ancestor levels to climb
 */
declare function ParentHelper(node: AstNode, levels?: number): Maybe<AstNode>

/**
 * Replace the current node
 *
 * @param replacement The code to put in place of the current node
 */
declare function UpdateHelper(replacement: string): void

/**
 * Replace the provided node
 *
 * @param node        The node to replace
 * @param replacement The code to put in place of the provided node
 */
declare function UpdateHelper(node: AstNode, replacement: string): void

/**
 * Tools to handle AST nodes
 */
export interface ManipulationHelpers {
  source: typeof SourceHelper
  parent: typeof ParentHelper
  update: typeof UpdateHelper
}

/**
 * A manipulator function which can be passed into the gyros() function
 */
export type Manipulator<T> = (node: AstNode, tools: ManipulationHelpers) => T

/**
 * An object representing a running gyros() call by its MagicString
 * instance, its options and its manipulator function
 */
export interface Context<T> {
  magicString: MagicString
  options: Options
  manipulator: Manipulator<T>
}

/**
 * The result of a synchronous gyros() call
 */
export interface SyncResult {
  readonly code: string
  readonly map: SourceMap
}

/**
 * The result of an asynchronous gyros() call
 */
export type AsyncResult = Promise<SyncResult>

/**
 * The synchronous or asynchronous result of a gyros() call,
 * dependending on its generic type variable
 */
export type Result<T> = T extends Promise<void> ? AsyncResult : SyncResult

/**
 * Transform the AST of some JavaScript source code
 *
 * @param source      The source code to transform
 * @param manipulator A callback which is executed for each encountered AST node
 */
function gyros<T>(
  source: string | Buffer,
  manipulator: Manipulator<T>
): Result<T>

/**
 * Transform the AST of some JavaScript source code
 *
 * @param source      The source code to transform
 * @param options     Options to provide to the parser
 * @param manipulator A callback which is executed for each encountered AST node
 */
function gyros<T>(
  source: string | Buffer,
  options: Options,
  manipulator: Manipulator<T>
): Result<T>

function gyros<T>(...gyrosArgs: any[]): any {
  let options: Options
  let manipulator: Manipulator<T>

  // Source is always the first argument
  // Coerce to string in case it's a Buffer object
  const source = String(gyrosArgs[0])

  if (typeof gyrosArgs[1] === 'function') {
    // If second argument is a function, options have been omitted
    options = {}
    manipulator = gyrosArgs[1]
  } else if (
    typeof gyrosArgs[1] === 'object' &&
    typeof gyrosArgs[2] === 'function'
  ) {
    // Type check for clarity in case of error
    options = gyrosArgs[1]
    manipulator = gyrosArgs[2]
  } else {
    // Invalid arguments, inform the user comprehensibly
    throw new Error(
      'Invalid arguments. After the source code argument, gyros() expects either an options object and a manipulator function or just a manipulator function'
    )
  }

  const phpParserOptions: any = {
    ...(options.phpParser ?? {}),
    ast: {
      ...(options.phpParser?.ast ?? {}),
      withPositions: true
    }
  }

  // Use `parser` option as parser if available
  const engine = new Engine(phpParserOptions)
  const rootNode =
    (options.parseMode ?? 'eval') === 'code'
      ? engine.parseCode(source, 'gyros.php')
      : engine.parseEval(source)

  // Create the resource all manipulations are performed on
  const magicString = new MagicString(source)

  // Create a context object that can be passed to helpers
  const context = { magicString, options, manipulator }

  // Preparation: collect metadata of the whole AST
  // Allows to modify nodes that have not been visited yet
  nodeMetadataStore.set(rootNode, { parent: undefined, context })

  collectTreeMetadata(rootNode, context)

  // Start the recursive walk
  const walkResult = handleNode(rootNode, context)

  // Create the result
  if (isPromise(walkResult)) {
    return walkResult.then(() => createResult(context))
  } else {
    return createResult(context)
  }
}

gyros.source = helpers.source
gyros.parent = helpers.parent
gyros.update = helpers.update

export { gyros }
