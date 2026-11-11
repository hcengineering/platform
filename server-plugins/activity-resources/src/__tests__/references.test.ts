//
// Copyright © 2023 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import contact from '@hcengineering/contact'
import core, { AccountRole, type Class, type Doc, type Ref, type Tx } from '@hcengineering/core'
import { EmptyMarkup, MarkupNodeType, jsonToMarkup } from '@hcengineering/text-core'

import { getPersonNotificationTxes, getReferencesData } from '../references'

jest.mock('@hcengineering/server-core', () => {
  const actual = jest.requireActual('@hcengineering/server-core')
  const source = jest.requireActual('../../../../foundations/server/packages/core/src/utils')
  return new Proxy(actual, {
    get (target: any, prop: string) {
      if (prop === 'canAuthorGrantMentionAccess') return source.canAuthorGrantMentionAccess
      return target[prop]
    }
  })
})

describe('extractBacklinks', () => {
  it('should return no references for empty document', () => {
    const content = EmptyMarkup
    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references).toEqual([])
  })

  it('should parse single backlink', () => {
    const content = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' hello'
            }
          ]
        }
      ]
    })

    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references.length).toBe(1)
    expect(references).toEqual([
      {
        attachedTo: 'id',
        attachedToClass: 'contact:class:Person',
        collection: 'references',
        srcDocId: 'srcDocId',
        srcDocClass: 'srcDocClass',
        message:
          '{"type":"paragraph","content":[{"type":"reference","attrs":{"id":"id","objectclass":"contact:class:Person","label":"Appleseed John"}},{"type":"text","text":" hello"}]}',
        attachedDocId: 'attachedDocId',
        attachedDocClass: 'attachedDocClass'
      }
    ])
  })

  it('should parse single backlink for multiple references', () => {
    const content = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' '
            },
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            }
          ]
        }
      ]
    })

    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references.length).toBe(1)
  })
})

describe('getPersonNotificationTxes mention collaborator grants', () => {
  const senderId = 'sender-social' as any
  const senderAccount = 'sender-account' as any
  const mentionedAccount = 'mentioned-account' as any
  const issue: any = {
    _id: 'issue-1',
    _class: 'tracker:class:Issue',
    space: 'space-1'
  }

  function makeControl ({
    role,
    isMember,
    protectedTarget
  }: {
    role: AccountRole
    isMember: boolean
    protectedTarget: boolean
  }): any {
    const space = {
      _id: issue.space,
      _class: core.class.Space,
      space: core.space.Space,
      private: true,
      members: isMember ? [senderAccount] : [],
      owners: []
    }

    return {
      ctx: {
        contextData: {
          account: { uuid: senderAccount, role },
          socialStringsToUsers: new Map([[senderId, { accontUuid: senderAccount, role }]])
        }
      },
      hierarchy: {
        isDerived: () => false,
        getAncestors: () => [issue._class]
      },
      modelDb: {
        findAllSync: () => (protectedTarget ? [{ attachedTo: issue._class, provideSecurity: true }] : [])
      },
      txFactory: {
        createTxCreateDoc: (_class: string, objectSpace: string, attributes: any) => ({
          _class: core.class.TxCreateDoc,
          objectClass: _class,
          objectSpace,
          attributes
        })
      },
      findAll: jest.fn(async (_ctx: any, _class: string, query: any) => {
        if (_class === activity.class.UserMentionInfo) return []
        if (_class === core.class.Space) return [space]
        if (_class === contact.mixin.Employee) return [{ personUuid: mentionedAccount }]
        if (query._id === issue._id) return [issue]
        return []
      })
    }
  }

  async function collaboratorGrants (control: any): Promise<Tx[]> {
    return await getPersonNotificationTxes(
      {} as any,
      {
        attachedTo: 'mentioned-person' as any,
        attachedToClass: contact.class.Person,
        attachedDocId: issue._id,
        attachedDocClass: issue._class,
        srcDocId: issue._id,
        srcDocClass: issue._class,
        message: 'mention',
        collection: 'references'
      },
      control,
      senderId,
      issue.space,
      { _class: core.class.TxUpdateDoc, objectClass: issue._class } as any,
      {} as any
    )
  }

  function hasMentionCollaborator (txes: Tx[]): boolean {
    return txes.some(
      (tx: any) => tx.objectClass === core.class.Collaborator && tx.attributes.collaborator === mentionedAccount
    )
  }

  test.each([
    ['guest sender', AccountRole.Guest, false],
    ['non-member user sender', AccountRole.User, false]
  ])('does not grant a protected issue mention for a %s', async (_label, role, isMember) => {
    const txes = await collaboratorGrants(makeControl({ role, isMember, protectedTarget: true }))

    expect(hasMentionCollaborator(txes)).toBe(false)
  })

  test('grants a protected issue mention for a member user', async () => {
    const txes = await collaboratorGrants(
      makeControl({ role: AccountRole.User, isMember: true, protectedTarget: true })
    )

    expect(hasMentionCollaborator(txes)).toBe(true)
  })

  test('grants a protected issue mention for a maintainer outside the space', async () => {
    const txes = await collaboratorGrants(
      makeControl({ role: AccountRole.Maintainer, isMember: false, protectedTarget: true })
    )

    expect(hasMentionCollaborator(txes)).toBe(true)
  })

  test('preserves collaborator creation for an unprotected class', async () => {
    const txes = await collaboratorGrants(
      makeControl({ role: AccountRole.Guest, isMember: false, protectedTarget: false })
    )

    expect(hasMentionCollaborator(txes)).toBe(true)
  })
})
