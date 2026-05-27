import { extractReferences } from '../reference'
import { MarkupNodeType, type MarkupNode } from '../model'

function refNode (id: string, label: string, objectclass: string, grantsAccess?: 'true' | 'false'): MarkupNode {
  return {
    type: MarkupNodeType.reference,
    attrs: { id, label, objectclass, ...(grantsAccess !== undefined ? { grantsAccess } : {}) }
  }
}

function doc (...children: MarkupNode[]): MarkupNode {
  return { type: MarkupNodeType.doc, content: children }
}

describe('extractReferences grantsAccess', () => {
  test('surfaces grantsAccess from a reference node', () => {
    const refs = extractReferences(doc(refNode('p1', 'Alice', 'contact:class:Person', 'true')))
    expect(refs).toHaveLength(1)
    expect(refs[0].objectId).toBe('p1')
    expect(refs[0].grantsAccess).toBe('true')
  })

  test('grantsAccess undefined when attr absent (default = grant)', () => {
    const refs = extractReferences(doc(refNode('p1', 'Alice', 'contact:class:Person')))
    expect(refs[0].grantsAccess).toBeUndefined()
  })

  test('any-wins: false then true => true', () => {
    const refs = extractReferences(
      doc(
        refNode('p1', 'Alice', 'contact:class:Person', 'false'),
        refNode('p1', 'Alice', 'contact:class:Person', 'true')
      )
    )
    expect(refs).toHaveLength(1)
    expect(refs[0].grantsAccess).toBe('true')
  })

  test('any-wins: true then false => true', () => {
    const refs = extractReferences(
      doc(
        refNode('p1', 'Alice', 'contact:class:Person', 'true'),
        refNode('p1', 'Alice', 'contact:class:Person', 'false')
      )
    )
    expect(refs[0].grantsAccess).toBe('true')
  })

  test('any-wins: false then undefined => not false (undefined grants)', () => {
    const refs = extractReferences(
      doc(
        refNode('p1', 'Alice', 'contact:class:Person', 'false'),
        refNode('p1', 'Alice', 'contact:class:Person')
      )
    )
    expect(refs[0].grantsAccess).not.toBe('false')
  })

  test('all explicitly false => false', () => {
    const refs = extractReferences(
      doc(
        refNode('p1', 'Alice', 'contact:class:Person', 'false'),
        refNode('p1', 'Alice', 'contact:class:Person', 'false')
      )
    )
    expect(refs[0].grantsAccess).toBe('false')
  })

  test('different persons kept separate', () => {
    const refs = extractReferences(
      doc(
        refNode('p1', 'Alice', 'contact:class:Person', 'true'),
        refNode('p2', 'Bob', 'contact:class:Person', 'false')
      )
    )
    expect(refs).toHaveLength(2)
    expect(refs.find((r) => r.objectId === 'p1')?.grantsAccess).toBe('true')
    expect(refs.find((r) => r.objectId === 'p2')?.grantsAccess).toBe('false')
  })
})
