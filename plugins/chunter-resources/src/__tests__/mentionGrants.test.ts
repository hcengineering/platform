import { markupToJSON, jsonToMarkup, type MarkupNode, MarkupNodeType } from '@hcengineering/text-core'
import { applyMentionGrantChoices } from '../mentionGrants'

function refNode (id: string): MarkupNode {
  return { type: MarkupNodeType.reference, attrs: { id, label: id, objectclass: 'contact:class:Person' } }
}
function docMarkup (...refs: MarkupNode[]): string {
  return jsonToMarkup({ type: MarkupNodeType.doc, content: refs })
}
function grantsOf (markup: string, id: string): Array<'true' | 'false' | undefined> {
  const node = markupToJSON(markup)
  const out: Array<'true' | 'false' | undefined> = []
  const walk = (n: MarkupNode): void => {
    if (n.type === MarkupNodeType.reference && n.attrs?.id === id) {
      out.push(n.attrs.grantsAccess as 'true' | 'false' | undefined)
    }
    n.content?.forEach(walk)
  }
  walk(node)
  return out
}

describe('applyMentionGrantChoices', () => {
  test('deselect sets grantsAccess=false on the person reference', () => {
    const result = applyMentionGrantChoices(docMarkup(refNode('p1')), new Map([['p1', false]]))
    expect(grantsOf(result, 'p1')).toEqual(['false'])
  })

  test('select sets grantsAccess=true explicitly', () => {
    const result = applyMentionGrantChoices(docMarkup(refNode('p1')), new Map([['p1', true]]))
    expect(grantsOf(result, 'p1')).toEqual(['true'])
  })

  test('deselect rewrites EVERY reference to that person', () => {
    const result = applyMentionGrantChoices(docMarkup(refNode('p1'), refNode('p1')), new Map([['p1', false]]))
    expect(grantsOf(result, 'p1')).toEqual(['false', 'false'])
  })

  test('persons absent from the choice map are left unchanged', () => {
    const result = applyMentionGrantChoices(docMarkup(refNode('p1'), refNode('p2')), new Map([['p1', false]]))
    expect(grantsOf(result, 'p1')).toEqual(['false'])
    expect(grantsOf(result, 'p2')).toEqual([undefined])
  })

  test('empty choice map is a no-op', () => {
    const markup = docMarkup(refNode('p1'))
    const result = applyMentionGrantChoices(markup, new Map())
    expect(grantsOf(result, 'p1')).toEqual([undefined])
  })
})
