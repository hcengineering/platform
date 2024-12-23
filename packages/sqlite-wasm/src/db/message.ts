import {
    type Message,
    type MessageID,
    type CardID,
    type FindMessagesParams,
    SortOrder,
    type SocialID,
    type RichText,
    Direction, type Reaction, type Attachment
} from '@communication/types'

import {BaseDb} from './base.ts'
import {
    TableName,
    type MessageDb,
    type MessagePlaceDb,
    type AttachmentDb,
    type ReactionDb,
    type PatchDb
} from './types.ts'

export class MessagesDb extends BaseDb {
    //Message
    async createMessage(content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
        const dbData: MessageDb = {
            id: self.crypto.randomUUID(),
            content: content,
            creator: creator,
            created: created,
        }
        await this.insert(TableName.Message, dbData)
        return dbData.id as MessageID
    }

    async removeMessage(message: MessageID): Promise<void> {
        await this.remove(TableName.Message, {id: message})
    }

    async placeMessage(message: MessageID, card: CardID, workspace: string): Promise<void> {
        const dbData: MessagePlaceDb = {
            workspace_id: workspace,
            card_id: card,
            message_id: message
        }
        await this.insert(TableName.MessagePlace, dbData)
    }

    async createPatch(message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void> {
        const dbData: PatchDb = {
            id: self.crypto.randomUUID(),
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
        const select = `SELECT m.id,
                               m.content,
                               m.creator,
                               m.created,
                               json_group_array(
                                       json_object(
                                               'content', p.content,
                                               'creator', p.creator,
                                               'created', p.created
                                       )
                               ) AS patches,
                               json_group_array(
                                       json_object(
                                               'card_id', a.card_id,
                                               'message_id', a.message_id,
                                               'creator', a.creator,
                                               'created', a.created
                                       )
                               ) AS attachments,
                               json_group_array(
                                       json_object(
                                               'message_id', r.message_id,
                                               'reaction', r.reaction,
                                               'creator', r.creator,
                                               'created', r.created
                                       )
                               ) AS reactions
                        FROM ${TableName.Message} m
                         INNER JOIN ${TableName.MessagePlace} mp ON m.id = mp.message_id
                         LEFT JOIN ${TableName.Patch} p ON p.message_id = m.id
                         LEFT JOIN ${TableName.Attachment} a ON a.message_id = m.id
                         LEFT JOIN ${TableName.Reaction} r ON r.message_id = m.id`

        const where= this.buildMessageWhere(workspace, params)
        const groupBy = `GROUP BY m.id`
        const orderBy = params.sort ? `ORDER BY m.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}` : ''
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, groupBy, orderBy, limit].join(' ')

        const result = await this.select(sql)

        return result.map(it => this.toMessage(it))
    }

    buildMessageWhere(workspace: string, params: FindMessagesParams): string {
        const where: string[] = [`mp.workspace_id = '${workspace}'`]
        for (const key of Object.keys(params)) {
            const value = (params as any)[key]
            switch (key) {
                case 'id': {
                    where.push(`m.id = '${value}'`)
                    break
                }
                case 'card': {
                    where.push(`mp.card_id = '${value}'`)
                    break
                }
                case 'from': {
                    if(value == null) continue
                    const exclude = params.excluded ?? false
                    const direction = params.direction ?? Direction.Forward
                    const getOperator = () => {
                        if (exclude) {
                            return direction === Direction.Forward ? '>' : '<'
                        } else {
                            return direction === Direction.Forward ? '>=' : '<='
                        }
                    }

                    where.push(`m.created ${getOperator()} ${value}`)
                    break
                }
            }
        }

        return `WHERE ${where.join(' AND ')}`
    }

    private toMessage(row: any): Message {
        const patches = JSON.parse(row.patches).filter((it: any) => it.created != null)
        const attachments = JSON.parse(row.attachments).filter((it: any) => it.created != null)
        const reactions = JSON.parse(row.reactions).filter((it: any) => it.created != null)

        const lastPatch = patches?.[0]

        return {
            id: row.id,
            content: lastPatch?.content ?? row.content,
            creator: row.creator,
            created: new Date(row.created),
            edited: (lastPatch?.created ?? row.created),
            reactions: (reactions ?? []).map((it: any) => this.toReaction(it)),
            attachments: (attachments ?? []).map((it: any) => this.toAttachment(it))
        }
    }

    private toReaction(row: any): Reaction {
        return {
            message: row.message_id,
            reaction: row.reaction,
            creator: row.creator,
            created: new Date(row.created)
        }
    }

    private toAttachment(row: any): Attachment {
        return {
            message: row.message_id,
            card: row.card,
            creator: row.creator,
            created: new Date(row.created)
        }
    }
}

