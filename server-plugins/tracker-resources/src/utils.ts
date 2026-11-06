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

import { type Ref } from '@hcengineering/core'
import tracker, { type Issue, type IssueParentInfo } from '@hcengineering/tracker'

export function arrayEquals<T> (first: Array<T>, second: Array<T>): boolean {
  if (first === second) {
    return true
  }

  if (first.length !== second.length) {
    return false
  }

  return first.every((val, index) => val === second[index])
}

export type ParentChainDoc = Pick<Issue, '_id' | 'attachedTo' | 'title' | 'identifier' | 'space' | 'parents'>

function hasParent (issue: ParentChainDoc): boolean {
  return issue.attachedTo != null && issue.attachedTo !== tracker.ids.NoParent
}

/**
 * Builds the denormalised `parents` chain of an issue (nearest parent first)
 * by walking `attachedTo` upwards through `docs`, which must hold the current
 * state of the ancestors.
 *
 * If an ancestor is not in `docs`, the stored chain of the last known issue is
 * used from that point on.
 */
export function buildParentInfo (issue: ParentChainDoc, docs: Map<Ref<Issue>, ParentChainDoc>): IssueParentInfo[] {
  const result: IssueParentInfo[] = []
  const seen = new Set<Ref<Issue>>([issue._id])
  let current = issue
  while (hasParent(current)) {
    const parentId = current.attachedTo
    const parent = docs.get(parentId)
    if (parent === undefined) {
      result.push(...current.parents)
      break
    }
    if (seen.has(parentId)) break
    seen.add(parentId)
    result.push({ parentId, parentTitle: parent.title, identifier: parent.identifier, space: parent.space })
    current = parent
  }
  return result
}

/**
 * @returns true when both chains hold the same parents info, in the same order.
 */
export function parentInfoEquals (first: IssueParentInfo[], second: IssueParentInfo[]): boolean {
  return (
    first.length === second.length &&
    first.every(
      (it, index) =>
        it.parentId === second[index].parentId &&
        it.parentTitle === second[index].parentTitle &&
        it.identifier === second[index].identifier &&
        it.space === second[index].space
    )
  )
}
