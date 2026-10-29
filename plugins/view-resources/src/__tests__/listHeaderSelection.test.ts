import { toggleGroupSelection } from '../components/list/ListHeader.svelte.helpers'

const doc = (_id: string): { _id: string } => ({ _id })

describe('toggleGroupSelection', () => {
  it('selects all group items when none of them is selected', () => {
    const other = doc('x')
    const group = [doc('a'), doc('b'), doc('c')]
    expect(toggleGroupSelection([other], group, 200).map((it) => it._id)).toEqual(['x', 'a', 'b', 'c'])
  })

  it('respects the selection limit', () => {
    const group = [doc('a'), doc('b'), doc('c')]
    expect(toggleGroupSelection([], group, 2).map((it) => it._id)).toEqual(['a', 'b'])
  })

  it('deselects the group when some of its items are selected and keeps other groups', () => {
    const group = [doc('a'), doc('b'), doc('c')]
    const selection = [doc('x'), doc('b')]
    expect(toggleGroupSelection(selection, group, 200).map((it) => it._id)).toEqual(['x'])
  })

  it('does nothing for an empty group', () => {
    const selection = [doc('x')]
    expect(toggleGroupSelection(selection, [], 200)).toEqual(selection)
  })
})
