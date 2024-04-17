/**
 * @jest-environment jsdom
 */

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

import { Editor, getSchema } from '@tiptap/core'
import { MarkupMarkType, MarkupNode, MarkupNodeType } from '../model'
import {
  areEqualMarkups,
  getMarkup,
  htmlToJSON,
  htmlToMarkup,
  htmlToPmNode,
  isEmptyMarkup,
  isEmptyNode,
  jsonToHTML,
  jsonToMarkup,
  jsonToText,
  markupToHTML,
  markupToJSON,
  markupToPmNode,
  pmNodeToHTML,
  pmNodeToJSON,
  pmNodeToMarkup
} from '../utils'
import { ServerKit } from '../../kits/server-kit'
import { nodeDoc, nodeParagraph, nodeText } from '../dsl'

// mock tiptap functions
jest.mock('@tiptap/html', () => ({
  generateHTML: jest.fn(() => '<p>hello</p>'),
  generateJSON: jest.fn(() => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
  }))
}))

const extensions = [ServerKit]

describe('EmptyMarkup', () => {
  it('is empty markup', async () => {
    const editor = new Editor({ extensions })
    expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
  })
})

describe('getMarkup', () => {
  it('with empty content', async () => {
    const editor = new Editor({ extensions })
    expect(getMarkup(editor)).toEqual('{"type":"doc","content":[{"type":"paragraph"}]}')
  })
  it('with some content', async () => {
    const editor = new Editor({ extensions, content: '<p>hello</p>' })
    expect(getMarkup(editor)).toEqual(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    )
  })
  it('with empty paragraphs as content', async () => {
    const editor = new Editor({ extensions, content: '<p></p><p></p>' })
    expect(getMarkup(editor)).toEqual('{"type":"doc","content":[{"type":"paragraph"},{"type":"paragraph"}]}')
  })
})

describe('isEmptyMarkup', () => {
  it('returns true for undefined content', async () => {
    expect(isEmptyMarkup(undefined)).toBeTruthy()
    expect(isEmptyMarkup('')).toBeTruthy()
  })
  it('returns true for empty content', async () => {
    const editor = new Editor({ extensions })
    expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
  })
  it('returns true for empty paragraphs content', async () => {
    const editor = new Editor({ extensions, content: '<p></p><p></p><p></p>' })
    expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
  })
  it('returns true for empty paragraphs content with spaces', async () => {
    const editor = new Editor({ extensions, content: '<p> </p><p> </p><p> </p>' })
    expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
  })
  it('returns false for not empty content', async () => {
    const editor = new Editor({ extensions, content: '<p>hello</p>' })
    expect(isEmptyMarkup(getMarkup(editor))).toBeFalsy()
  })
  it('returns true for various empty content', async () => {
    expect(isEmptyMarkup(jsonToMarkup({ type: MarkupNodeType.doc }))).toBeTruthy()
    expect(isEmptyMarkup(jsonToMarkup({ type: MarkupNodeType.doc, content: [] }))).toBeTruthy()
    expect(
      isEmptyMarkup(jsonToMarkup({ type: MarkupNodeType.doc, content: [{ type: MarkupNodeType.paragraph }] }))
    ).toBeTruthy()
    expect(
      isEmptyMarkup(
        jsonToMarkup({ type: MarkupNodeType.doc, content: [{ type: MarkupNodeType.paragraph, content: [] }] })
      )
    ).toBeTruthy()
  })
})

describe('areEqualMarkups', () => {
  it('returns true for the same content', async () => {
    const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    expect(areEqualMarkups(markup, markup)).toBeTruthy()
  })
  it('returns true for empty content', async () => {
    const markup1 = '{"type":"doc","content":[{"type":"paragraph"}]}'
    const markup2 = '{"type":"doc","content":[{"type":"paragraph","content":[]}]}'
    expect(areEqualMarkups(markup1, markup2)).toBeTruthy()
  })
  it('returns true for similar content', async () => {
    const markup1 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    const markup2 =
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello","content":[],"marks":[],"attrs": {"color": null}}]}]}'
    expect(areEqualMarkups(markup1, markup2)).toBeTruthy()
  })
  it('returns false for the same content with different spaces', async () => {
    const markup1 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    const markup2 =
      '{"type":"doc","content":[{"type":"hardBreak"},{"type":"paragraph","content":[{"type":"text","text":"hello"}]},{"type":"hardBreak"}]}'
    expect(areEqualMarkups(markup1, markup2)).toBeFalsy()
  })
  it('returns false for different content', async () => {
    const markup1 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    const markup2 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"world"}]}]}'
    expect(areEqualMarkups(markup1, markup2)).toBeFalsy()
  })
  it('returns false for different marks', async () => {
    const markup1 =
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello","marks":[{"type":"bold"}]}]}]}'
    const markup2 =
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello","marks":[{"type":"italic"}]}]}]}'
    expect(areEqualMarkups(markup1, markup2)).toBeFalsy()
  })
})

describe('isEmptyNode', () => {
  it('returns true for empty doc node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.doc,
      content: []
    }
    expect(isEmptyNode(node)).toBeTruthy()
  })

  it('returns true for empty paragraph node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: []
        }
      ]
    }
    expect(isEmptyNode(node)).toBeTruthy()
  })

  it('returns true for empty text node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: ''
            }
          ]
        }
      ]
    }
    expect(isEmptyNode(node)).toBeTruthy()
  })

  it('returns false for non-empty text node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello, world!'
        }
      ]
    }
    expect(isEmptyNode(node)).toBeFalsy()
  })

  it('returns false for non-empty text node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.horizontal_rule
        }
      ]
    }
    expect(isEmptyNode(node)).toBeFalsy()
  })

  it('returns false for non-empty node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello, world!'
        }
      ]
    }
    expect(isEmptyNode(node)).toBeFalsy()
  })
})

describe('pmNodeToMarkup', () => {
  it('converts ProseMirrorNode to Markup', () => {
    const schema = getSchema(extensions)
    const node = schema.node('paragraph', {}, [schema.text('Hello, world!')])

    expect(pmNodeToMarkup(node)).toEqual('{"type":"paragraph","content":[{"type":"text","text":"Hello, world!"}]}')
  })
})

describe('markupToPmNode', () => {
  it('converts markup to ProseMirrorNode', () => {
    const markup = '{"type":"paragraph","content":[{"type":"text","text":"Hello, world!"}]}'
    const node = markupToPmNode(markup)

    expect(node.type.name).toEqual('paragraph')
    expect(node.content.childCount).toEqual(1)
    expect(node.content.child(0).type.name).toEqual('text')
    expect(node.content.child(0).text).toEqual('Hello, world!')
  })
})

describe('markupToJSON', () => {
  it('with empty content', async () => {
    expect(markupToJSON('')).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [] }] })
  })
  it('with some content', async () => {
    const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    expect(markupToJSON(markup)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
    })
  })
})

describe('jsonToMarkup', () => {
  it('with some content', async () => {
    const json: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'hello'
            }
          ]
        }
      ]
    }
    expect(jsonToMarkup(json)).toEqual(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    )
  })
})

describe('pmNodeToJSON', () => {
  it('converts ProseMirrorNode to Markup', () => {
    const schema = getSchema(extensions)
    const node = schema.node('paragraph', {}, [schema.text('Hello, world!')])

    const json = nodeParagraph(nodeText('Hello, world!'))
    expect(pmNodeToJSON(node)).toEqual(json)
  })
})

describe('jsonToPmNode', () => {
  it('converts json to ProseMirrorNode', () => {
    const markup = '{"type":"paragraph","content":[{"type":"text","text":"Hello, world!"}]}'
    const node = markupToPmNode(markup)

    expect(node.type.name).toEqual('paragraph')
    expect(node.content.childCount).toEqual(1)
    expect(node.content.child(0).type.name).toEqual('text')
    expect(node.content.child(0).text).toEqual('Hello, world!')
  })
})

describe('htmlToMarkup', () => {
  it('converts HTML to Markup', () => {
    const html = '<p>hello</p>'
    const expectedMarkup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    expect(htmlToMarkup(html)).toEqual(expectedMarkup)
  })
})

describe('markupToHTML', () => {
  it('converts markup to HTML', () => {
    const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
    const expectedHtml = '<p>hello</p>'
    expect(markupToHTML(markup)).toEqual(expectedHtml)
  })
})

describe('htmlToJSON', () => {
  it('converts HTML to JSON', () => {
    const html = '<p>hello</p>'
    const json = nodeDoc(nodeParagraph(nodeText('hello')))
    expect(htmlToJSON(html)).toEqual(json)
  })
})

describe('jsonToHTML', () => {
  it('converts JSON to HTML', () => {
    const json = nodeDoc(nodeParagraph(nodeText('hello')))
    const html = '<p>hello</p>'
    expect(jsonToHTML(json)).toEqual(html)
  })
})

describe('pmNodeToHTML', () => {
  it('converts ProseMirrorNode to HTML', () => {
    const schema = getSchema(extensions)
    const node = schema.node('paragraph', {}, [schema.text('hello')])

    expect(pmNodeToHTML(node)).toEqual('<p>hello</p>')
  })
})

describe('htmlToPmNode', () => {
  it('converts html to ProseMirrorNode', () => {
    const node = htmlToPmNode('<p>hello</p>')

    expect(node.type.name).toEqual('doc')
    expect(node.content.childCount).toEqual(1)
    expect(node.content.child(0).type.name).toEqual('paragraph')
    expect(node.content.child(0).childCount).toEqual(1)
    expect(node.content.child(0).child(0).type.name).toEqual('text')
    expect(node.content.child(0).child(0).text).toEqual('hello')
  })
})

describe('jsonToText', () => {
  it('returns text for text node', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello, world!'
        }
      ]
    }
    expect(jsonToText(node)).toEqual('Hello, world!')
  })
  it('returns concatenated text for block node with multiple children', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello '
        },
        {
          type: MarkupNodeType.text,
          text: 'world!'
        }
      ]
    }
    expect(jsonToText(node)).toEqual('Hello world!')
  })
  it('returns text for node with link', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello! Check out '
        },
        {
          type: MarkupNodeType.text,
          text: 'this page',
          marks: [
            {
              type: MarkupMarkType.link,
              attrs: {
                href: 'http://example.com/'
              }
            }
          ]
        },
        {
          type: MarkupNodeType.text,
          text: '!'
        }
      ]
    }
    expect(jsonToText(node)).toEqual('Hello! Check out this page!')
  })
  it('returns empty string for block node with no children', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: []
    }
    expect(jsonToText(node)).toEqual('')
  })
  it('returns error for text node with no text', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.text,
      text: ''
    }
    expect(() => jsonToText(node)).toThrow('Empty text nodes are not allowed')
  })
  it('returns error for block node with empty children', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: ''
        },
        {
          type: MarkupNodeType.text,
          text: ''
        }
      ]
    }
    expect(() => jsonToText(node)).toThrow('Empty text nodes are not allowed')
  })
})
