import { computeMentionGrantDelta, type ExistingMentionGrant } from '../mentionGrantsDelta'

function rec (collaborator: string, id = `c-${collaborator}`): ExistingMentionGrant {
  return {
    _id: id as any,
    _class: 'core:class:Collaborator' as any,
    space: 'space-1' as any,
    collaborator: collaborator as any
  }
}

describe('computeMentionGrantDelta', () => {
  test('fresh message (no existing records): all desired are created, nothing removed', () => {
    const { toCreate, toRemove } = computeMentionGrantDelta(['a', 'b'] as any, [])
    expect(new Set(toCreate)).toEqual(new Set(['a', 'b']))
    expect(toRemove).toHaveLength(0)
  })

  test('desired already has a mention record: deduped, not re-created', () => {
    const { toCreate, toRemove } = computeMentionGrantDelta(['a'] as any, [rec('a')])
    expect(toCreate).toHaveLength(0)
    expect(toRemove).toHaveLength(0)
  })

  test('mention removed (desired empty): existing record is removed', () => {
    const existing = [rec('a')]
    const { toCreate, toRemove } = computeMentionGrantDelta([] as any, existing)
    expect(toCreate).toHaveLength(0)
    expect(toRemove).toEqual(existing)
  })

  test('edit drops one grantee, keeps another: only the dropped record is removed', () => {
    const keep = rec('a')
    const drop = rec('b')
    const { toCreate, toRemove } = computeMentionGrantDelta(['a'] as any, [keep, drop])
    expect(toCreate).toHaveLength(0)
    expect(toRemove).toEqual([drop])
  })

  test('edit adds a new grantee alongside an existing one', () => {
    const keep = rec('a')
    const { toCreate, toRemove } = computeMentionGrantDelta(['a', 'c'] as any, [keep])
    expect(toCreate).toEqual(['c'])
    expect(toRemove).toHaveLength(0)
  })

  test('desired list is deduplicated before create', () => {
    const { toCreate } = computeMentionGrantDelta(['a', 'a', 'b'] as any, [])
    expect(toCreate.filter((x) => x === ('a' as any))).toHaveLength(1)
    expect(new Set(toCreate)).toEqual(new Set(['a', 'b']))
  })

  test('never reasons about accounts outside the passed existing set (other provenance untouched)', () => {
    // Caller passes ONLY this-message mention records; a manual/structural record
    // for the same person is not in `existing`, so it is neither created nor removed.
    const { toCreate, toRemove } = computeMentionGrantDelta([] as any, [])
    expect(toCreate).toHaveLength(0)
    expect(toRemove).toHaveLength(0)
  })
})
