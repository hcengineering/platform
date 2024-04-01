import { nodeDoc, nodeImage, nodeParagraph, nodeReference, nodeText, markLink, markUnderline } from '../dsl'
import { MarkupNodeType } from '../model'
import { jsonToHTML } from '../utils'

describe('dsl', () => {
  it('returns a MarkupNode for complex doc', () => {
    const doc = nodeDoc(
      nodeParagraph(nodeText('Hello, '), nodeReference({ id: '123', label: 'World', objectclass: 'world' })),
      nodeParagraph(
        nodeText('Check out '),
        markLink({ href: 'https://example.com', title: 'this link' }, markUnderline(nodeText('this link'))),
        nodeText('.')
      )
    )
    expect(jsonToHTML(doc)).toEqual(
      '<p>Hello, <span data-type="reference" data-id="123" data-objectclass="world" data-label="World">@World</span></p><p>Check out <a target="_blank" rel="noopener noreferrer" class="cursor-pointer" href="https://example.com"><u>this link</u></a>.</p>'
    )
  })
})

describe('nodeDoc', () => {
  it('returns a MarkupNode with type "doc"', () => {
    const result = nodeDoc()
    expect(result.type).toEqual(MarkupNodeType.doc)
  })

  it('returns a MarkupNode with the provided content', () => {
    const content = [
      { type: MarkupNodeType.paragraph, content: [{ type: MarkupNodeType.text, text: 'Hello' }] },
      { type: MarkupNodeType.paragraph, content: [{ type: MarkupNodeType.text, text: 'World' }] }
    ]
    const result = nodeDoc(...content)
    expect(result.content).toEqual(content)
  })

  it('returns an empty MarkupNode if no content is provided', () => {
    const result = nodeDoc()
    expect(result.content).toEqual([])
  })
})

describe('nodeParagraph', () => {
  it('returns a MarkupNode with type "paragraph"', () => {
    const result = nodeParagraph()
    expect(result.type).toEqual(MarkupNodeType.paragraph)
  })

  it('returns a MarkupNode with the provided content', () => {
    const content = [{ type: MarkupNodeType.text, text: 'Hello' }]
    const result = nodeParagraph(...content)
    expect(result.content).toEqual(content)
  })

  it('returns an empty MarkupNode if no content is provided', () => {
    const result = nodeParagraph()
    expect(result.content).toEqual([])
  })
})

describe('nodeText', () => {
  it('returns a MarkupNode with type "text"', () => {
    const result = nodeText('Hello')
    expect(result.type).toEqual(MarkupNodeType.text)
  })

  it('returns a MarkupNode with the provided text', () => {
    const result = nodeText('Hello')
    expect(result.text).toEqual('Hello')
  })
})

describe('nodeImage', () => {
  it('returns a MarkupNode with type "image"', () => {
    const attrs = { src: 'image.jpg' }
    const result = nodeImage(attrs)
    expect(result.type).toEqual(MarkupNodeType.image)
  })

  it('returns a MarkupNode with the provided attributes', () => {
    const attrs = { src: 'image.jpg', alt: 'Image', width: 500, height: 300 }
    const result = nodeImage(attrs)
    expect(result.attrs).toEqual(attrs)
  })
})

describe('nodeReference', () => {
  it('returns a MarkupNode with type "reference"', () => {
    const attrs = { id: '123', label: 'Reference', objectclass: 'class' }
    const result = nodeReference(attrs)
    expect(result.type).toEqual(MarkupNodeType.reference)
  })

  it('returns a MarkupNode with the provided attributes', () => {
    const attrs = { id: '123', label: 'Reference', objectclass: 'class' }
    const result = nodeReference(attrs)
    expect(result.attrs).toEqual(attrs)
  })
})
