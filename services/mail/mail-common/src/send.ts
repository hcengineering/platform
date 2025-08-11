import { type TxOperations } from '@hcengineering/core'
import chat from '@hcengineering/chat'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import { type Card } from '@hcengineering/card'
import mail from '@hcengineering/mail'
import { normalizeEmail } from './utils'

export async function toNewMessage (client: TxOperations, message: CreateMessageEvent, email: string): Promise<void> {
  try {
    const thread = await client.findOne<Card>(chat.masterTag.Thread, { _id: message.cardId })
    console.log('Thread found', thread)
    if (thread?.parent == null) {
      return
    }
    const channel = await client.findOne(chat.masterTag.Channel, { _id: thread.parent })
    console.log('Channel found', channel)
    const mailChannel = await client.findOne(mail.tag.MailChannel, { _id: thread.parent })
    console.log('Mail channel found', mailChannel)
  } catch (error: any) {
    console.error('Error in toNewMessage:', error.message)
  }
}

export async function getChannel (client: TxOperations, email: string): Promise<Card | undefined> {
  const normalizedEmail = normalizeEmail(email)
  return await client.findOne<Card>(mail.tag.MailChannel, { title: normalizedEmail })
}
