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
import {
  AbstractType as YAbstractType,
  Doc as YDoc,
  applyUpdate,
  encodeStateAsUpdate,
  XmlElement as YXmlElement
} from 'yjs'

export { XmlElement as YXmlElement, XmlText as YXmlText, AbstractType as YAbstractType } from 'yjs'

/** @public */
export function yDocFromBuffer (buffer: Buffer, ydoc?: YDoc): YDoc {
  ydoc ??= new YDoc({ guid: generateId(), gc: false })
  try {
    const uint8arr = new Uint8Array(buffer)
    applyUpdate(ydoc, uint8arr)
    return ydoc
  } catch (err) {
    throw new Error('Failed to apply ydoc update', { cause: err })
  }
}

/** @public */
export function yDocToBuffer (ydoc: YDoc): Buffer {
  const update = encodeStateAsUpdate(ydoc)
  return Buffer.from(update.buffer)
}

/** @public */
export function yDocCopyXmlField (ydoc: YDoc, source: string, target: string): void {
  const srcField = ydoc.getXmlFragment(source)
  const dstField = ydoc.getXmlFragment(target)

  ydoc.transact((tr) => {
    // similar to XmlFragment's clone method
    dstField.delete(0, dstField.length)
    dstField.insert(0, srcField.toArray().map((item) => (item instanceof YAbstractType ? item.clone() : item)) as any)
  })
}

/**
 * @public
 * Replaces standard clone method that only copies string attributes
 * https://github.com/yjs/yjs/blob/main/src/types/YXmlElement.js#L97
 * @param src YXmlElement
 * @returns YXmlElement
 */
export function yXmlElementClone (src: YXmlElement): YXmlElement {
  const el = new YXmlElement(src.nodeName)
  const attrs = src.getAttributes()

  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value as any)
  })

  el.insert(
    0,
    src
      .toArray()
      .map((item) =>
        item instanceof YAbstractType ? (item instanceof YXmlElement ? yXmlElementClone(item) : item.clone()) : item
      ) as any
  )

  return el
}
