//
// Copyright © 2026 TraceX SAS.
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

import { type Attrs, type MarkupNode, MarkupNodeType } from '../model'
import { areEqualMarkups, hashAttrs, isEmptyMarkup, jsonToMarkup, stripHash } from '../utils'

describe('hashAttrs', () => {
  it('should return a hash of length 8', () => {
    const attrs = { a: 1 }
    const hash = hashAttrs(attrs)
    expect(hash.length).toEqual(8)
  })
  it('should return the same hash for the same attrs', () => {
    const attrs = { a: 1, b: 2 }
    const hash1 = hashAttrs(attrs)
    const hash2 = hashAttrs(attrs)
    expect(hash1).toEqual(hash2)
  })

  it('should return different hashes for different attrs', () => {
    const attrs1 = { a: 1, b: 2 }
    const attrs2 = { a: 1, b: 3 }
    const hash1 = hashAttrs(attrs1)
    const hash2 = hashAttrs(attrs2)
    expect(hash1).not.toEqual(hash2)
  })
})

describe('stripHash', () => {
  it('should return the name without the hash', () => {
    const name = 'bold--c0decafe'
    const result = stripHash(name)
    expect(result).toEqual('bold')
  })

  it('should return the original name if no hash is present', () => {
    const name = 'bold'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })

  it('should return the original name if the hash is not 8 characters long', () => {
    const name = 'bold--1234567'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })

  it('should return the original name if the hash is not a valid base64 string', () => {
    const name = 'bold--invalid!'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })
})

interface ContentNodeCase {
  type: MarkupNodeType
  attrs: Attrs
  changedAttrs: Attrs
}

const contentNodes: ContentNodeCase[] = [
  {
    type: MarkupNodeType.embed,
    attrs: { src: 'ref://drive:class:File/first-file' },
    changedAttrs: { src: 'ref://drive:class:File/second-file' }
  },
  {
    type: MarkupNodeType.file,
    attrs: { 'file-id': 'first-file', 'data-file-name': 'report.pdf' },
    changedAttrs: { 'file-id': 'second-file', 'data-file-name': 'report.pdf' }
  },
  {
    type: MarkupNodeType.drawingBoard,
    attrs: { id: 'first-board', height: 500 },
    changedAttrs: { id: 'second-board', height: 500 }
  }
]

describe.each(contentNodes)('$type document content', ({ type, attrs, changedAttrs }) => {
  const document: MarkupNode = {
    type: MarkupNodeType.doc,
    content: [{ type, attrs }, { type: MarkupNodeType.paragraph }]
  }
  const markup = jsonToMarkup(document)

  it('treats a document containing only the content node as nonempty', () => {
    expect(isEmptyMarkup(markup)).toBe(false)
  })

  it('distinguishes the content from an empty snapshot', () => {
    expect(areEqualMarkups('', markup)).toBe(false)
    expect(areEqualMarkups(markup, '')).toBe(false)
  })

  it('detects a change to the content node', () => {
    const changed: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [{ type, attrs: changedAttrs }, { type: MarkupNodeType.paragraph }]
    }
    expect(areEqualMarkups(markup, jsonToMarkup(changed))).toBe(false)
  })
})
