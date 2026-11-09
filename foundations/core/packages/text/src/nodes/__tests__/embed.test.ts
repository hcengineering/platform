/**
 * @jest-environment jsdom
 */
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

import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { DOMParser, DOMSerializer } from '@tiptap/pm/model'
import { EmbedNode } from '../embed'

const schema = getSchema([Document, Paragraph, Text, EmbedNode])
const src = 'https://example.com/embed'

function parse (html: string): ReturnType<DOMParser['parse']> {
  const root = document.createElement('div')
  root.innerHTML = html
  return DOMParser.fromSchema(schema).parse(root)
}

describe('Embed HTML', () => {
  it('parses the editor node view without converting its preview content to text', () => {
    const doc = parse(`<div data-type="embed" data-embed-src=" ${src} "><a href="${src}">Preview</a></div>`)
    expect(doc.childCount).toBe(1)
    expect(doc.firstChild?.type.name).toBe('embed')
    expect(doc.firstChild?.attrs.src).toBe(src)
  })

  it('serializes a link fallback and preserves the embed on round trip', () => {
    const embed = schema.nodes.embed.create({ src })
    const root = document.createElement('div')
    root.append(DOMSerializer.fromSchema(schema).serializeNode(embed))
    expect(root.firstElementChild?.getAttribute('data-embed-src')).toBe(src)
    expect(root.querySelector('a')?.getAttribute('href')).toBe(src)
    expect(root.querySelector('iframe')).toBeNull()
    expect(parse(root.innerHTML).firstChild?.eq(embed)).toBe(true)
  })

  it('continues to parse the previous iframe representation', () => {
    const doc = parse(`<figure data-type="embed"><iframe src="${src}"></iframe></figure>`)
    expect(doc.firstChild?.type.name).toBe('embed')
    expect(doc.firstChild?.attrs.src).toBe(src)
  })

  it('does not treat a div without an embed source as an embed', () => {
    const doc = parse('<div data-type="embed"><p>Text</p></div>')
    expect(doc.firstChild?.type.name).toBe('paragraph')
    expect(doc.textContent).toBe('Text')
  })
})
