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

import { XmlElement, XmlFragment, XmlText, Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'

// These tests pin the one behavioural difference between updateContent and
// appendContent: both encode the incoming markup as a Y.js update and apply it
// inside the document's XmlFragment, but updateContent clears the fragment
// first (fragment.delete(0, fragment.length)) while appendContent does not.
// Clearing => replace; not clearing => the CRDT merges the new content in,
// giving append semantics while preserving concurrent edits.

const field = 'content'

function makeDoc (text: string): YDoc {
  const doc = new YDoc()
  const fragment = doc.getXmlFragment(field)
  const paragraph = new XmlElement('paragraph')
  paragraph.insert(0, [new XmlText(text)])
  fragment.insert(0, [paragraph])
  return doc
}

function textOf (doc: YDoc): string {
  return doc.getXmlFragment(field).toString()
}

describe('appendContent semantics', () => {
  it('append (no fragment.delete) into an empty document adds the new content', () => {
    const target = new YDoc()
    const incoming = makeDoc('new')

    applyUpdate(target, encodeStateAsUpdate(incoming))

    expect(textOf(target)).toContain('new')
  })

  it('append (no fragment.delete) preserves prior content and adds the new content', () => {
    const target = makeDoc('existing')
    const incoming = makeDoc('new')

    applyUpdate(target, encodeStateAsUpdate(incoming))

    const result = textOf(target)
    expect(result).toContain('existing')
    expect(result).toContain('new')
  })

  it('update (with fragment.delete) replaces prior content', () => {
    const target = makeDoc('existing')
    const incoming = makeDoc('new')

    target.transact(() => {
      const fragment: XmlFragment = target.getXmlFragment(field)
      fragment.delete(0, fragment.length)
      applyUpdate(target, encodeStateAsUpdate(incoming))
    })

    const result = textOf(target)
    expect(result).not.toContain('existing')
    expect(result).toContain('new')
  })

  it('two independent appends both land (CRDT merge, no clobber)', () => {
    const target = makeDoc('base')
    const appendA = makeDoc('alpha')
    const appendB = makeDoc('beta')

    // Simulate two automations appending concurrently: each encodes against a
    // fresh doc and its update is merged into the shared target.
    applyUpdate(target, encodeStateAsUpdate(appendA))
    applyUpdate(target, encodeStateAsUpdate(appendB))

    const result = textOf(target)
    expect(result).toContain('base')
    expect(result).toContain('alpha')
    expect(result).toContain('beta')
  })
})
