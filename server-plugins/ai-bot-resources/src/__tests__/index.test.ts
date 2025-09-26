//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import core, {
  type Doc,
  type Ref,
  type Class,
  type PersonId,
  type Space,
  type SocialIdType,
  type TxCreateDoc
} from '@hcengineering/core'
import chunter, { type ChatMessage, type ThreadMessage } from '@hcengineering/chunter'
import { type ActivityMessage } from '../../../../plugins/activity/types'
import contact, { type Person, type SocialIdentity } from '@hcengineering/contact'
import { type TriggerControl } from '@hcengineering/server-core'
import { getAccountBySocialKey } from '@hcengineering/server-contact'

import plugin from '../index'
import * as utils from '../utils'

jest.mock('../utils', () => ({
  hasAiEndpoint: jest.fn(),
  sendAIEvents: jest.fn()
}))

jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialKey: jest.fn()
}))

const aiBotPersonId = '684d7786acf962fc450c9668' as Ref<Person>

function createSocialIdentity (): SocialIdentity {
  return {
    _class: contact.class.SocialIdentity,
    _id: '1080807657619881985' as Ref<SocialIdentity> & PersonId,
    attachedTo: aiBotPersonId,
    attachedToClass: contact.class.Person,
    collection: 'socialIds',
    createdBy: '1080807657619881985' as PersonId,
    createdOn: 1749907334330,
    key: 'email:huly.ai.bot@hc.engineering',
    value: 'email:huly.ai.bot@hc.engineering',
    modifiedBy: '1080807657619881985' as PersonId,
    modifiedOn: 1749907334330,
    space: 'contact:space:Contacts' as Ref<Space>,
    type: 'email' as SocialIdType
  }
}

function createAiBotPerson (): Doc {
  return {
    _class: contact.class.Person,
    _id: aiBotPersonId,
    createdBy: '1080807657619881985' as PersonId,
    createdOn: 1749907334289,
    modifiedBy: '1080809591990779905' as PersonId,
    modifiedOn: 1750284961630,
    space: contact.space.Contacts
  }
}

function createChannel (): any {
  return {
    _class: chunter.class.Channel,
    _id: 'chunter:space:Random' as Ref<SocialIdentity>,
    archived: false,
    autoJoin: true,
    createdBy: 'core:account:System',
    createdOn: 1749907332178,
    description: 'Random Talks',
    docUpdateMessages: 1,
    members: ['f91a6c38-ba6a-40d6-9fc1-f025134f6041', '4583f5e4-20b6-4fa1-b929-84ea66a7d539'],
    messages: 2,
    modifiedBy: '1080809591990779905',
    modifiedOn: 1750285289466,
    name: 'random',
    'notification:mixin:Collaborators': {
      collaborators: ['4583f5e4-20b6-4fa1-b929-84ea66a7d539', 'f91a6c38-ba6a-40d6-9fc1-f025134f6041']
    },
    private: false,
    space: 'core:space:Space',
    topic: 'Random Talks'
  }
}

function createChatMessage (params: {
  _id: string
  attachedTo: string
  attachedToClass: Ref<Class<Doc>>
  collection: string
  message: string
  space: Ref<Space>
  createdBy?: PersonId
  modifiedBy?: PersonId
}): ChatMessage {
  return {
    _class: chunter.class.ChatMessage,
    _id: params._id as Ref<ChatMessage>,
    attachedTo: params.attachedTo as Ref<Doc>,
    attachedToClass: params.attachedToClass,
    attachments: 0,
    collection: params.collection,
    createdBy: params.createdBy ?? ('1080809591990779905' as PersonId),
    createdOn: 1750284961630,
    message: params.message,
    modifiedBy: params.modifiedBy ?? ('1080809591990779905' as PersonId),
    modifiedOn: 1750284961630,
    space: params.space
  }
}

function createThreadMessage (params: {
  _id: string
  attachedTo: string
  attachedToClass: Ref<Class<Doc>>
  message: string
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  space: Ref<Space>
  createdBy?: PersonId
}): ThreadMessage {
  return {
    _class: chunter.class.ThreadMessage,
    _id: params._id as Ref<ThreadMessage>,
    attachedTo: params.attachedTo as Ref<ActivityMessage>,
    attachedToClass: params.attachedToClass,
    attachments: 0,
    collection: 'replies',
    createdBy: params.createdBy ?? ('1080809591990779905' as PersonId),
    createdOn: 1750322755416,
    message: params.message,
    modifiedBy: params.createdBy ?? ('1080809591990779905' as PersonId),
    modifiedOn: 1750322755416,
    objectClass: params.objectClass,
    objectId: params.objectId,
    space: params.space
  }
}

describe('OnMessageSend', () => {
  const mockControl = {
    ctx: {
      contextData: {
        account: {
          socialIds: ['1080807657619881985' as PersonId]
        }
      }
    },
    workspace: {
      uuid: 'test-workspace-uuid'
    },
    hierarchy: {
      isDerived: jest.fn((messageClass, target) => messageClass === target)
    },
    findAll: jest.fn(),
    lowLevel: {},
    branding: {} as any,
    txFactory: {}
  }

  beforeEach(() => {
    ;(utils.hasAiEndpoint as jest.Mock).mockReturnValue(true)
    ;(utils.sendAIEvents as jest.Mock).mockImplementation(async () => {})
    ;(utils.sendAIEvents as jest.Mock).mockReset()
    ;(getAccountBySocialKey as jest.Mock).mockResolvedValue(null)
    ;(getAccountBySocialKey as jest.Mock).mockReset()
    mockControl.findAll.mockReset()
  })

  it('should not process messages when AI endpoint is not available', async () => {
    ;(utils.hasAiEndpoint as jest.Mock).mockReturnValue(false)

    const message = createChatMessage({
      _id: '68533a9590d9cd9f454b6087',
      attachedTo: aiBotPersonId,
      attachedToClass: contact.class.Person as Ref<Class<Doc>>,
      collection: 'comments',
      message:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Personal message to bot"}]}]}',
      space: 'contact:space:Contacts' as Ref<Space>
    })

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).not.toHaveBeenCalled()
    expect(getAccountBySocialKey).not.toHaveBeenCalled()
  })

  it('should process personal message to AI bot', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createAiBotPerson()
    const message = createChatMessage({
      _id: '68533a9590d9cd9f454b6087',
      attachedTo: aiBotPersonId,
      attachedToClass: contact.class.Person,
      collection: 'comments',
      message:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Personal message to bot"}]}]}',
      space: contact.space.Contacts
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          messageId: message._id,
          message: message.message,
          objectId: message.attachedTo,
          objectClass: message.attachedToClass,
          objectSpace: messageDoc.space,
          collection: message.collection
        })
      ],
      expect.anything(),
      expect.anything()
    )
  })

  it('AI bot should not reply to self message', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createAiBotPerson()
    const message = createChatMessage({
      _id: '68533a9590d9cd9f454b6087',
      attachedTo: aiBotPersonId,
      attachedToClass: contact.class.Person,
      collection: 'comments',
      createdBy: socialIdentity._id,
      modifiedBy: socialIdentity._id,
      message: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"AI bot reply"}]}]}',
      space: contact.space.Contacts
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [socialIdentity._id])
      .mockImplementationOnce(async () => [messageDoc])

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).not.toHaveBeenCalled()
  })

  it('should not process channel message without AI bot mention', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createChannel()
    const message = createChatMessage({
      _id: '68533b3290d9cd9f454b609f',
      attachedTo: 'chunter:space:Random',
      attachedToClass: chunter.class.Channel as Ref<Class<Doc>>,
      collection: 'messages',
      message: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Channel message"}]}]}',
      space: 'chunter:space:Random' as Ref<Space>
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).not.toHaveBeenCalled()
  })

  it('should process channel message with AI bot mention', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createChannel()
    const message = createChatMessage({
      _id: '68533bdd0be81f9a017418bc',
      attachedTo: 'chunter:space:Random',
      attachedToClass: chunter.class.Channel as Ref<Class<Doc>>,
      collection: 'messages',
      message: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"reference","attrs":{"id":"${aiBotPersonId}","objectclass":"contact:class:Person","label":"Jolie AI"}},{"type":"text","text":" with mention"}]}]}`,
      space: 'chunter:space:Random' as Ref<Space>
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          messageId: message._id,
          message: message.message,
          objectId: message.attachedTo,
          objectClass: message.attachedToClass,
          objectSpace: messageDoc.space,
          collection: message.collection
        })
      ],
      expect.anything(),
      expect.anything()
    )
  })

  it('should process thread message with AI bot mention', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createChannel()
    const message = createThreadMessage({
      _id: '6853ce2be8428c3ce73c8a09',
      attachedTo: '68533bdd0be81f9a017418bc',
      attachedToClass: chunter.class.ChatMessage,
      message: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"reference","attrs":{"id":"${aiBotPersonId}","objectclass":"contact:class:Person","label":"Jolie AI"}},{"type":"text","text":" thread with mention"}]}]}`,
      objectClass: chunter.class.Channel,
      objectId: 'chunter:space:Random' as Ref<Doc<Space>>,
      space: 'chunter:space:Random' as Ref<Space>
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])
    mockControl.hierarchy.isDerived.mockImplementation(
      (messageClass: string) => messageClass === chunter.class.ThreadMessage
    )

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          messageId: message._id,
          message: message.message,
          objectId: message.attachedTo,
          objectClass: message.attachedToClass,
          objectSpace: messageDoc.space,
          collection: message.collection
        })
      ],
      expect.anything(),
      expect.anything()
    )
  })

  it('should not process thread message without AI bot mention', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createChannel()
    const message = createThreadMessage({
      _id: '6853cea7e8428c3ce73c8a8e',
      attachedTo: '68533bdd0be81f9a017418bc',
      attachedToClass: chunter.class.ChatMessage,
      message: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In channel thread"}]}]}',
      objectClass: chunter.class.Channel,
      objectId: 'chunter:space:Random' as Ref<Doc<Space>>,
      space: 'chunter:space:Random' as Ref<Space>
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])
    mockControl.hierarchy.isDerived.mockImplementation(
      (messageClass: string) => messageClass === chunter.class.ThreadMessage
    )

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).not.toHaveBeenCalled()
  })

  it('should process message in personal AI bot thread', async () => {
    const socialIdentity = createSocialIdentity()
    const messageDoc = createAiBotPerson()
    const message = createThreadMessage({
      _id: '6853cf39e8428c3ce73c8b09',
      attachedTo: '68533a9590d9cd9f454b6087',
      attachedToClass: chunter.class.ChatMessage,
      message:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In personal thread"}]}]}',
      objectClass: contact.class.Person,
      objectId: aiBotPersonId,
      space: 'contact:space:Contacts' as Ref<Space>
    })

    mockControl.findAll
      .mockImplementationOnce(async () => [socialIdentity])
      .mockImplementationOnce(async () => [messageDoc])
    mockControl.hierarchy.isDerived.mockImplementation(
      (messageClass: string) => messageClass === chunter.class.ThreadMessage
    )

    const tx = {
      _class: core.class.TxCreateDoc,
      objectId: message._id,
      attributes: message
    } as unknown as TxCreateDoc<ChatMessage>

    const plugin_ = await plugin()
    const result = await plugin_.trigger.OnMessageSend([tx], mockControl as unknown as TriggerControl)

    expect(result).toEqual([])
    expect(utils.sendAIEvents).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          messageId: message._id,
          message: message.message,
          objectId: message.attachedTo,
          objectClass: message.attachedToClass,
          objectSpace: message.space,
          collection: message.collection
        })
      ],
      expect.anything(),
      expect.anything()
    )
  })
})
