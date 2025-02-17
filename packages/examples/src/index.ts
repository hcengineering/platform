import {
  type Message,
  type SocialID,
  SortOrder,
  type CardID,
  type Window,
  type WorkspaceID
} from '@hcengineering/communication-types'
import { getWebsocketClient } from '@hcengineering/communication-client-ws'
import { getSqliteClient } from '@hcengineering/communication-client-sqlite'
import { createMessagesQuery, initLiveQueries } from '@hcengineering/communication-client-query'

const card = 'cd0aba36-1c4f-4170-95f2-27a12a5415f6' as CardID
const workspace = 'cd0aba36-1c4f-4170-95f2-27a12a5415f6' as WorkspaceID
const personalWorkspace = 'cd0aba36-1c4f-4170-95f2-27a12a5415f5' as WorkspaceID
const creator1 = 'email:vasya@huly.com' as SocialID

async function getClient(type: 'ws' | 'sqlite') {
  if (type === 'ws') {
    const platformUrl = 'ws://localhost:8090'
    const token = 'token'
    return await getWebsocketClient(platformUrl, token)
  }

  return await getSqliteClient(workspace, personalWorkspace)
}

export async function example() {
  const client = await getClient('sqlite')
  initLiveQueries(client)

  const query1 = createMessagesQuery()

  let window: Window<Message> | undefined = undefined

  query1.query({ card, sort: SortOrder.Desc }, (res) => {
    window = res
    const r = window.getResult()
    r.reverse()
    showMessages(r)
  })

  document.getElementById('forward-button')?.addEventListener('click', async () => {
    if (window == null) return
    await window.loadNextPage()
  })

  document.getElementById('backward-button')?.addEventListener('click', async () => {
    if (window == null) return
    await window.loadPrevPage()
  })

  async function editMessage(message: Message) {
    await client.createPatch(card, message.id, message.content + '_1_', creator1)
  }

  async function deleteMessage(message: Message) {
    await client.removeMessage(card, message.id)
  }

  async function addReaction(message: Message) {
    await client.createReaction(card, message.id, '👍', creator1)
  }

  async function removeReaction(message: Message) {
    await client.removeReaction(card, message.id, '👍', creator1)
  }

  function scrollToBottom() {
    const el = document.getElementById('chat')
    if (el == null) return
    el.scrollTo(0, el.scrollHeight)
  }

  async function showMessages(messages: ReadonlyArray<Message>) {
    const el = document.getElementById('messages')
    if (el == null) return
    el.innerHTML = ''
    for (const message of messages) {
      const div = el.appendChild(document.createElement('div'))
      div.className = 'message'

      const messageContent = document.createElement('span')
      messageContent.textContent = message.content + ' ' + message.reactions.map((it) => it.reaction).join(' ')
      // + ' ' + messages.created.getTime()
      div.appendChild(messageContent)

      const buttonsDiv = document.createElement('div')
      buttonsDiv.className = 'buttons'

      const editButton = document.createElement('button')
      editButton.textContent = 'Edit'
      editButton.className = 'edit-button'
      editButton.addEventListener('click', () => editMessage(message))
      buttonsDiv.appendChild(editButton)

      const deleteButton = document.createElement('button')
      deleteButton.textContent = 'Remove'
      deleteButton.className = 'delete-button'
      deleteButton.addEventListener('click', () => deleteMessage(message))
      buttonsDiv.appendChild(deleteButton)

      const addReactionButton = document.createElement('button')
      addReactionButton.textContent = '+R'
      addReactionButton.className = 'add-reaction-button'
      addReactionButton.addEventListener('click', () => addReaction(message))
      buttonsDiv.appendChild(addReactionButton)

      const removeReactionButton = document.createElement('button')
      removeReactionButton.textContent = '-R'
      removeReactionButton.className = 'remove-reaction-button'
      removeReactionButton.addEventListener('click', () => removeReaction(message))
      buttonsDiv.appendChild(removeReactionButton)

      div.appendChild(buttonsDiv)
    }
    scrollToBottom()
  }

  document.getElementById('form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    // @ts-expect-error error
    const el = event.target?.getElementsByTagName('input')[0] as HTMLInputElement
    if (el.value == '' || el.value == null) return

    await client.createMessage(card, el.value, creator1)

    el.value = ''
  })
}

void example()
