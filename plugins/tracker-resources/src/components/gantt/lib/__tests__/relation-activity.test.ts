//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Class, Doc, Ref } from '@hcengineering/core'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import {
  isBrokenRelationDum,
  patchFromTxes,
  type RelationDum,
  type RelationCreateTx
} from '../relation-activity-migration'

const ISSUE_CLASS = 'tracker:class:Issue' as Ref<Class<Doc>>
const RELATION_CLASS = 'tracker:class:IssueRelation' as Ref<Class<Doc>>

function dum (partial: Partial<RelationDum> = {}): RelationDum {
  return {
    _id: 'd1' as Ref<Doc>,
    objectId: 'r1' as Ref<IssueRelation>,
    objectClass: RELATION_CLASS,
    action: 'remove',
    attachedTo: 'r1' as Ref<Doc>,
    attachedToClass: RELATION_CLASS,
    updateCollection: undefined,
    txId: undefined,
    ...partial
  }
}

describe('isBrokenRelationDum', () => {
  it('returns true when attachedToClass is the relation itself (legacy removeDoc path)', () => {
    expect(isBrokenRelationDum(dum({ attachedToClass: RELATION_CLASS }))).toBe(true)
  })

  it('returns false when attachedToClass is already Issue', () => {
    expect(
      isBrokenRelationDum(
        dum({ attachedToClass: ISSUE_CLASS, attachedTo: 'i1' as Ref<Doc>, updateCollection: 'relations' })
      )
    ).toBe(false)
  })

  it('returns true even when class is Issue but updateCollection is missing', () => {
    expect(isBrokenRelationDum(dum({ attachedToClass: ISSUE_CLASS, attachedTo: 'i1' as Ref<Doc> }))).toBe(true)
  })

  it('returns false for create-action DUMs (only remove leaks)', () => {
    expect(isBrokenRelationDum(dum({ action: 'create', attachedToClass: RELATION_CLASS }))).toBe(false)
  })
})

describe('patchFromTxes', () => {
  it('returns Issue-side patch when createTx present', () => {
    const out = patchFromTxes(dum(), {
      _id: 'tx1' as Ref<Doc>,
      _class: 'core:class:TxCreateDoc' as RelationCreateTx['_class'],
      objectId: 'r1' as Ref<IssueRelation>,
      attachedTo: 'i1' as Ref<Issue>,
      attachedToClass: ISSUE_CLASS,
      collection: 'relations'
    })
    expect(out).toEqual({
      attachedTo: 'i1',
      attachedToClass: ISSUE_CLASS,
      updateCollection: 'relations'
    })
  })

  it('defaults updateCollection to "relations" when createTx has no explicit collection', () => {
    const out = patchFromTxes(dum(), {
      _id: 'tx1' as Ref<Doc>,
      _class: 'core:class:TxCreateDoc' as RelationCreateTx['_class'],
      objectId: 'r1' as Ref<IssueRelation>,
      attachedTo: 'i1' as Ref<Issue>,
      attachedToClass: ISSUE_CLASS
    })
    expect(out?.updateCollection).toBe('relations')
  })

  it('returns undefined when createTx missing (best-effort placeholder)', () => {
    expect(patchFromTxes(dum(), undefined)).toBeUndefined()
  })

  it('returns undefined when createTx has no attachedTo (defensive)', () => {
    const out = patchFromTxes(dum(), {
      _id: 'tx1' as Ref<Doc>,
      _class: 'core:class:TxCreateDoc' as RelationCreateTx['_class'],
      objectId: 'r1' as Ref<IssueRelation>
    })
    expect(out).toBeUndefined()
  })
})
