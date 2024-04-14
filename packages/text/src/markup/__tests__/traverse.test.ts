import { MarkupNode, MarkupNodeType } from '../model'
import { traverseAllMarks, traverseNode, traverseNodeMarks } from '../traverse'

describe('traverseNode', () => {
  it('should call the callback function for each node', () => {
    const callback = jest.fn()
    const node = {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Hello, world!'
        }
      ]
    }

    traverseNode(node as MarkupNode, callback)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(node)
    expect(callback).toHaveBeenCalledWith(node.content[0])
  })

  it('should stop traversing if the callback returns false', () => {
    const callback = jest.fn((node) => {
      if (node.type === MarkupNodeType.paragraph) {
        return false
      }
    })
    const node = {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello, world!'
        }
      ]
    }

    traverseNode(node, callback)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(node)
  })
})

describe('traverseNodeMarks', () => {
  it('should call the callback function for each mark', () => {
    const callback = jest.fn()
    const node = {
      type: 'paragraph',
      marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }]
    }

    traverseNodeMarks(node as MarkupNode, callback)

    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenCalledWith(node.marks[0])
    expect(callback).toHaveBeenCalledWith(node.marks[1])
    expect(callback).toHaveBeenCalledWith(node.marks[2])
  })

  it('should not call the callback function if marks are not present', () => {
    const callback = jest.fn()
    const node = {
      type: MarkupNodeType.paragraph
    }

    traverseNodeMarks(node, callback)

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('traverseAllMarks', () => {
  it('should traverse all marks and call the callback function', () => {
    const callback = jest.fn()
    const node = {
      type: 'paragraph',
      marks: [{ type: 'bold' }],
      content: [
        {
          type: MarkupNodeType.text,
          text: 'Hello, world!',
          marks: [{ type: 'italic' }, { type: 'underline' }]
        }
      ]
    }

    traverseAllMarks(node as MarkupNode, callback)

    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenCalledWith(node, node.marks[0])
    expect(callback).toHaveBeenCalledWith(node.content[0], node.content[0].marks[0])
    expect(callback).toHaveBeenCalledWith(node.content[0], node.content[0].marks[1])
  })
})
