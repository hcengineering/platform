import {
    type Message,
    type MessageID,
    type CardID,
    type FindMessagesParams,
    SortOrder,
    type SocialID,
    type RichText,
    Direction, type Reaction, type Attachment, type ThreadID
} from '@hcengineering/communication-types'

import {BaseDb} from './base.ts'
import {
    TableName,
    type MessageDb,
    type AttachmentDb,
    type ReactionDb,
    type PatchDb
} from './types.ts'

export class MessagesDb extends BaseDb {
    //Message
    async createMessage(workspace: string, thread: ThreadID, content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
        const dbData: MessageDb = {
            workspace_id: workspace,
            thread_id: thread,
            content: content,
            creator: creator,
            created: created,
        }

        const id = await this.insertWithReturn(TableName.Message, dbData, 'id')

        return id as MessageID
    }

    async removeMessage(message: MessageID): Promise<void> {
        await this.remove(TableName.Message, {id: message})
    }

    async createPatch(message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void> {
        const dbData: PatchDb = {
            message_id: message,
            content: content,
            creator: creator,
            created: created
        }

        await this.insert(TableName.Patch, dbData)
    }

    //Attachment
    async createAttachment(message: MessageID, card: CardID, creator: SocialID, created: Date): Promise<void> {
        const dbData: AttachmentDb = {
            message_id: message,
            card_id: card,
            creator: creator,
            created: created
        }
        await this.insert(TableName.Attachment, dbData)
    }

    async removeAttachment(message: MessageID, card: CardID): Promise<void> {
        await this.remove(TableName.Attachment, {
            message_id: message,
            card_id: card
        })
    }

    //Reaction
    async createReaction(message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void> {
        const dbData: ReactionDb = {
            message_id: message,
            reaction: reaction,
            creator: creator,
            created: created
        }
        await this.insert(TableName.Reaction, dbData)
    }

    async removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
        await this.remove(TableName.Reaction, {
            message_id: message,
            reaction: reaction,
            creator: creator
        })
    }

    //Find messages
    async find(workspace: string, params: FindMessagesParams): Promise<Message[]> {
        //TODO: experiment with select to improve performance
        const select = `SELECT m.id,
                               m.content,
                               m.creator,
                               m.created,
                               ${this.subSelectPatches()},
                               ${this.subSelectAttachments()},
                               ${this.subSelectReactions()}
                        FROM ${TableName.Message} m`

        const {where, values} = this.buildMessageWhere(workspace, params)
        const orderBy = params.sort ? `ORDER BY m.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}` : ''
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, orderBy, limit].join(' ')

        const result = await this.client.unsafe(sql, values)

        return result.map(it => this.toMessage(it)) as Message[]
    }

    buildMessageWhere(workspace: string, params: FindMessagesParams): { where: string, values: any[] } {
        const where: string[] = ['m.workspace_id = $1']
        const values: any[] = [workspace]

        let index = 2

        if (params.id != null) {
            where.push(`m.id = $${index++}`)
            values.push(params.id)
        }

        if (params.thread != null) {
            where.push(`m.thread_id = $${index++}`)
            values.push(params.thread)
        }

        if (params.from != null) {
            const exclude = params.excluded ?? false
            const direction = params.direction ?? Direction.Forward
            const getOperator = () => {
                if (exclude) {
                    return direction === Direction.Forward ? '>' : '<'
                } else {
                    return direction === Direction.Forward ? '>=' : '<='
                }
            }

            where.push(`m.created ${getOperator()} $${index++}`)
            values.push(params.from)
        }


        return {where: `WHERE ${where.join(' AND ')}`, values}
    }

    subSelectPatches(): string {
        return `array(
                   SELECT jsonb_build_object(
                                  'content', p.content,
                                  'creator', p.creator,
                                  'created', p.created
                          )
                   FROM ${TableName.Patch} p
                   WHERE p.message_id = m.id
                   ) AS patches`
    }

    subSelectAttachments(): string {
        return `array(
                   SELECT jsonb_build_object(
                                  'card_id', a.card_id,
                                  'message_id', a.message_id,
                                  'creator', a.creator,
                                  'created', a.created
                          )
                   FROM ${TableName.Attachment} a
                   WHERE a.message_id = m.id
               ) AS attachments`
    }

    subSelectReactions(): string {
        return `array(
                   SELECT jsonb_build_object(
                                  'message_id', r.message_id,
                                  'reaction', r.reaction,
                                  'creator', r.creator,
                                  'created', r.created
                          )
                   FROM ${TableName.Reaction} r
                   WHERE r.message_id = m.id
               ) AS reactions`
    }

    toMessage(row: any): Message {
        const lastPatch = row.patches?.[0]

        return {
            id: row.id,
            thread: row.thread_id,
            content: lastPatch?.content ?? row.content,
            creator: row.creator,
            created: new Date(row.created),
            edited: new Date(lastPatch?.created ?? row.created),
            reactions: (row.reactions ?? []).map(this.toReaction),
            attachments: (row.attachments ?? []).map(this.toAttachment)
        }
    }

    toReaction(row: any): Reaction {
        return {
            message: row.message_id,
            reaction: row.reaction,
            creator: row.creator,
            created: new Date(row.created)
        }
    }

    toAttachment(row: any): Attachment {
        return {
            message: row.message_id,
            card: row.card_id,
            creator: row.creator,
            created: new Date(row.created)
        }
    }
}

