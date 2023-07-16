import { expect } from 'vitest'

/**
 * This is the touchstone test for Gyros.
 *
 * It offers some `src` code to be transformed by the test so that the
 * resulting code satisfies the `validate()` function.
 * This is the case when the transformation wraps each array of `src`
 * in a `fun()` call.
 *
 * @param {number} additionalTests Number of additional tests performed
 *                                 outside of the validate() function
 */
export function arrayBase(additionalTests = 0) {
  expect.assertions(5 + additionalTests)

  return {
    src: `(function () {
  $xs = [ 1, 2, [ 3, 4 ] ];
  $ys = [ 5, 6 ];
  g([ $xs, $ys ]);
})()`,

    validate(output: string) {
      const arrays = [
        // inner xs
        [3, 4],

        // outer xs
        [1, 2, [3, 4]],

        // ys
        [5, 6],

        // [ xs, ys ]
        [
          [1, 2, [3, 4]],
          [5, 6]
        ]
      ]

      Function(
        'fun',
        'g',
        output
      )(
        (xs: any) => {
          expect(arrays.shift()).toEqual(xs)
          return xs
        },
        (xs: any) => {
          expect(xs).toEqual([
            [1, 2, [3, 4]],
            [5, 6]
          ])
        }
      )
    }
  }
}
