//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { MarkupMark, MarkupNode } from './model'

export function traverseNode (node: MarkupNode, f: (el: MarkupNode) => boolean | undefined): void {
  const result = f(node)
  if (result !== false) {
    node.content?.forEach((p) => {
      traverseNode(p, f)
    })
  }
}

export function traverseNodeMarks (node: MarkupNode, f: (el: MarkupMark) => void): void {
  node.marks?.forEach((p) => {
    f(p)
  })
}

export function traverseNodeContent (node: MarkupNode, f: (el: MarkupNode) => void): void {
  node.content?.forEach((p) => {
    f(p)
  })
}

export function traverseAllMarks (node: MarkupNode, f: (el: MarkupNode, mark: MarkupMark) => void): void {
  traverseNode(node, (node) => {
    traverseNodeMarks(node, (mark) => {
      f(node, mark)
    })
    return true
  })
}
