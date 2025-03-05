//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { MarkupMark, MarkupMarkType } from '@hcengineering/text-core'
import { deepEqual } from 'fast-equals'

export function markAttrs (mark: MarkupMark): Record<string, string> {
  return mark.attrs ?? {}
}

export function isInSet (mark: MarkupMark, marks: MarkupMark[]): boolean {
  return marks.find((m) => markEq(mark, m)) !== undefined
}

export function addToSet (mark: MarkupMark, marks: MarkupMark[]): MarkupMark[] {
  const m = marks.find((m) => markEq(mark, m))
  if (m !== undefined) {
    // We already have mark
    return marks
  }
  return [...marks, mark]
}

export function removeFromSet (markType: MarkupMarkType, marks: MarkupMark[]): MarkupMark[] {
  return marks.filter((m) => m.type !== markType)
}

export function sameSet (a?: MarkupMark[], b?: MarkupMark[]): boolean {
  return deepEqual(a, b)
}

export function markEq (first: MarkupMark, other: MarkupMark): boolean {
  return deepEqual(first, other)
}
