//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Diff, diffAny, Operation } from 'rfc6902/diff'
import { Pointer } from 'rfc6902/pointer'

interface ArrayOperation {
  op: 'add' | 'remove' | 'replace'
  index: number
  value?: any
  original?: number
}
interface MemoValue {
  operations: ArrayOperation[]
  cost: number
}

/**
 * @public
 * Modification of {diffArray} from rfc6902/diff, with respect to prosemirror model.
 */
export function diffArraysPM (input: any, output: any, ptr: Pointer, diff: Diff = diffAny): any {
  // set up cost matrix (very simple initialization: just a map)
  const memo: Record<string, MemoValue> = {
    '0,0': { operations: [], cost: 0 }
  }
  /**
    Calculate the cheapest sequence of operations required to get from
    input.slice(0, i) to output.slice(0, j).
    There may be other valid sequences with the same cost, but none cheaper.

    @param i The row in the layout above
    @param j The column in the layout above
    @returns An object containing a list of operations, along with the total cost
             of applying them (+1 for each add/remove/replace operation)
    */
  function dist (i: number, j: number): MemoValue {
    // memoized
    const memoKey = `${i},${j}`
    let memoized = memo[memoKey]
    if (memoized === undefined) {
      // TODO: this !diff(...).length usage could/should be lazy
      if (i > 0 && j > 0 && diff(input[i - 1], output[j - 1], ptr.add(String(i - 1))).length === 0) {
        // equal (no operations => no cost)
        memoized = dist(i - 1, j - 1)
      } else {
        const alternatives: MemoValue[] = []
        if (i > 0) {
          // NOT topmost row
          const removeBase = dist(i - 1, j)
          const removeOperation: ArrayOperation = {
            op: 'remove',
            index: i - 1
          }
          alternatives.push(appendArrayOperation(removeBase, removeOperation))
        }
        if (j > 0) {
          // NOT leftmost column
          const addBase: MemoValue = dist(i, j - 1)
          const addOperation: ArrayOperation = {
            op: 'add',
            index: i - 1,
            value: output[j - 1]
          }
          alternatives.push(appendArrayOperation(addBase, addOperation))
        }
        if (i > 0 && j > 0) {
          // TABLE MIDDLE
          // supposing we replaced it, compute the rest of the costs:
          const replaceBase = dist(i - 1, j - 1)
          // okay, the general plan is to replace it, but we can be smarter,
          // recursing into the structure and replacing only part of it if
          // possible, but to do so we'll need the original value
          const replaceOperation: ArrayOperation = {
            op: 'replace',
            index: i - 1,
            original: input[i - 1],
            value: output[j - 1]
          }
          // Replace only if simple or object's with type equal
          const io = input[i - 1]
          const jo = output[j - 1]
          if (
            (typeof io !== 'object' && typeof jo !== 'object') ||
            (typeof io === 'object' &&
              typeof jo === 'object' &&
              io.type === jo.type &&
              Array.isArray(io.content) &&
              Array.isArray(jo.content))
          ) {
            alternatives.push(appendArrayOperation(replaceBase, replaceOperation))
          }
        }
        // the only other case, i === 0 && j === 0, has already been memoized
        // the meat of the algorithm:
        // sort by cost to find the lowest one (might be several ties for lowest)
        // [4, 6, 7, 1, 2].sort((a, b) => a - b) -> [ 1, 2, 4, 6, 7 ]
        const best = alternatives.sort(function (a, b) {
          return a.cost - b.cost
        })[0]
        memoized = best
      }
      memo[memoKey] = memoized
    }
    return memoized
  }
  // handle weird objects masquerading as Arrays that don't have proper length
  // properties by using 0 for everything but positive numbers
  const inputLength: number = isNaN(input.length) || input.length <= 0 ? 0 : input.length
  const outputLength: number = isNaN(output.length) || output.length <= 0 ? 0 : output.length
  const arrayOperations = dist(inputLength, outputLength).operations
  const paddedOperations = arrayOperations.reduce(
    function (_a: any, arrayOperation: ArrayOperation) {
      const operations: Operation[] = _a[0]
      const padding: number = _a[1]
      if (arrayOperation.op === 'add') {
        const paddedIndex = arrayOperation.index + 1 + padding
        const indexToken = paddedIndex < inputLength + padding ? String(paddedIndex) : '-'
        const operation: Operation = {
          op: arrayOperation.op,
          path: ptr.add(indexToken).toString(),
          value: arrayOperation.value
        }
        // padding++ // maybe only if array_operation.index > -1 ?
        return [operations.concat(operation), padding + 1]
      } else if (arrayOperation.op === 'remove') {
        const operation: Operation = {
          op: arrayOperation.op,
          path: ptr.add(String(arrayOperation.index + padding)).toString()
        }
        // padding--
        return [operations.concat(operation), padding - 1]
      } else {
        // replace
        const replacePtr = ptr.add(String(arrayOperation.index + padding))
        const replaceOperations = diff(arrayOperation.original, arrayOperation.value, replacePtr)
        return [operations.concat.apply(operations, replaceOperations), padding]
      }
    },
    [[], 0]
  )[0]
  return paddedOperations
}

function appendArrayOperation (base: MemoValue, operation: ArrayOperation): MemoValue {
  return {
    // the new operation must be pushed on the end
    operations: base.operations.concat(operation),
    cost: base.cost + 1
  }
}
