import {
    type Message,
    type MessageID,
    type CardID,
    type FindMessagesParams,
    SortOrder,
    type SocialID,
    type RichText,
    Direction,
    type BlobID,
    type MessagesGroup,
    type FindMessagesGroupsParams
} from '@hcengineering/communication-types'
import {generateMessageId} from "@hcengineering/communication-core";

import {BaseDb} from './base.ts'
import {
    TableName,
    type MessageDb,
    type AttachmentDb,
    type ReactionDb,
    type PatchDb,
    type MessagesGroupDb,
    toMessage,
    toMessagesGroup
} from './schema.ts'
import {getCondition} from './utils.ts';


export class MessagesDb extends BaseDb {
    //Message
    async createMessage(card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
        const dbData: MessageDb = {
            id: generateMessageId(),
            workspace_id: this.workspace,
            card_id: card,
            content: content,
            creator: creator,
            created: created,
        }

        await this.insert(TableName.Message, dbData)

        return dbData.id as MessageID
    }

    async removeMessage(card: CardID, message: MessageID): Promise<MessageID | undefined> {
        const result = await this.removeWithReturn(TableName.Message, {id: message, workspace_id: this.workspace, card_id: card}, "id")
        return result[0] as MessageID | undefined
    }

    async removeMessages(card: CardID, ids: MessageID[]): Promise<MessageID[]> {
        const result = await this.removeWithReturn(TableName.Message, {
            workspace_id: this.workspace,
            card_id: card,
            id: ids
        }, "id")
        return result.map((it: any) => it.id)
    }

    async createPatch(card: CardID, message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void> {
        const dbData: PatchDb = {
            workspace_id: this.workspace,
            card_id: card,
            message_id: message,
            content: content,
            creator: creator,
            created: created
        }

        await this.insert(TableName.Patch, dbData)
    }

    //MessagesGroup
    async createMessagesGroup(card: CardID, blobId: BlobID, from_id: MessageID, to_id: MessageID, from_date: Date, to_date: Date, count: number): Promise<void> {
        const dbData: MessagesGroupDb = {
            workspace_id: this.workspace,
            card_id: card,
            blob_id: blobId,
            from_id,
            to_id,
            from_date,
            to_date,
            count
        }
        await this.insert(TableName.MessagesGroup, dbData)
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
    async createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void> {
        const dbData: ReactionDb = {
            workspace_id: this.workspace,
            card_id: card,
            message_id: message,
            reaction: reaction,
            creator: creator,
            created: created
        }
        await this.insert(TableName.Reaction, dbData)
    }

    async removeReaction( card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
        await this.remove(TableName.Reaction, {
            workspace_id: this.workspace,
            card_id: card,
            message_id: message,
            reaction: reaction,
            creator: creator
        })
    }

    //Find messages
    async find(params: FindMessagesParams): Promise<Message[]> {
        //TODO: experiment with select to improve performance
        const select = `SELECT m.id,
                               m.card_id,
                               m.content,
                               m.creator,
                               m.created,
                               ${this.subSelectPatches()},
                               ${this.subSelectAttachments()},
                               ${this.subSelectReactions()}
                        FROM ${TableName.Message} m`

        const {where, values} = this.buildMessageWhere( params)
        const orderBy = params.sort ? `ORDER BY m.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}` : ''
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, orderBy, limit].join(' ')

        const result = await this.client.unsafe(sql, values)

        return result.map((it: any) => toMessage(it))
    }

    buildMessageWhere(params: FindMessagesParams): { where: string, values: any[] } {
        const where: string[] = ['m.workspace_id = $1']
        const values: any[] = [this.workspace]

        let index = 2

        if (params.id != null) {
            where.push(`m.id = $${index++}`)
            values.push(params.id)
        }

        if (params.card != null) {
            where.push(`m.card_id = $${index++}`)
            values.push(params.card)
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
                   WHERE p.message_id = m.id AND p.workspace_id = m.workspace_id AND p.card_id = m.card_id
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
                   WHERE r.message_id = m.id AND r.workspace_id = m.workspace_id AND r.card_id = m.card_id
               ) AS reactions`
    }


    //Find messages groups
    async findGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
        const select = `SELECT mg.card_id,
                               mg.blob_id,
                               mg.from_id,
                               mg.to_id,
                               mg.count
                        FROM ${TableName.MessagesGroup} mg`

        const {where, values, index} = this.buildMessagesGroupWhere(this.workspace, params)
        const orderBy =  params.sortBy ? `ORDER BY ${index} ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}` : ''
        if(params.sortBy) {
            values.push(params.sortBy)
        }
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, orderBy, limit].join(' ')

        const result = await this.client.unsafe(sql, values)

        return result.map((it: any) => toMessagesGroup(it))
    }

    buildMessagesGroupWhere(workspace: string, params: FindMessagesGroupsParams): {
        where: string,
        values: any[],
        index: number
    } {
        const where: string[] = ['mg.workspace_id = $1']
        const values: any[] = [workspace]

        let index = 2

        if (params.card != null) {
            where.push(`mg.card_id = $${index++}`)
            values.push(params.card)
        }

        if (params.blobId != null) {
            where.push(`mg.blob_id = $${index++}`)
            values.push(params.blobId)
        }

        const fromIdCondition = getCondition("mg", "from_id", index, params.fromId);
        if (fromIdCondition != null) {
            where.push(fromIdCondition.where);
            values.push(fromIdCondition.value);
            index++;
        }

        const toIdCondition = getCondition("mg", "to_id", index, params.toId);

        if (toIdCondition != null) {
            where.push(toIdCondition.where);
            values.push(toIdCondition.value);
            index++;
        }

        const fromDateCondition = getCondition("mg", "from_date", index, params.fromDate);
        if (fromDateCondition != null) {
            where.push(fromDateCondition.where);
            values.push(fromDateCondition.value);
            index++;
        }

        const toDateCondition = getCondition("mg", "to_date", index, params.toDate);
        if (toDateCondition != null) {
            where.push(toDateCondition.where);
            values.push(toDateCondition.value);
            index++;
        }


        return {where: `WHERE ${where.join(' AND ')}`, values, index}
    }
}

