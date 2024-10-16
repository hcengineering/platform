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

import { generateId } from '@hcengineering/core'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'

/**
 * Branch (copy) document content as is.
 *
 * If the source document has gc parameter enabled, then garbage
 * collection will be performed. The result document will have the same
 * gc parameter value as the source document.
 *
 * @public
 * */
export function yDocBranch (source: YDoc): YDoc {
  const target = new YDoc({ guid: generateId(), gc: source.gc })

  const update = encodeStateAsUpdate(source)
  applyUpdate(target, update)

  return target
}

/**
 * Branch (copy) document content with garbage collecting while applying update.
 *
 * Garbage collection will be performed regardless of the gc parameter
 * in the source document. The result document will have the same gc
 * parameter value as the source document.
 *
 * @public
 * */
export function yDocBranchWithGC (source: YDoc): YDoc {
  const target = new YDoc({ guid: generateId(), gc: source.gc })

  const gc = new YDoc({ guid: generateId(), gc: true })
  applyUpdate(gc, encodeStateAsUpdate(source))
  applyUpdate(target, encodeStateAsUpdate(gc))

  return target
}
