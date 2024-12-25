import {
    type CardID,
    type FindMessagesParams,
    type ID,
    type Message,
    type Patch,
    SortOrder
} from '@communication/types'
import {
    type AttachmentCreatedEvent,
    type MessageCreatedEvent,
    type PatchCreatedEvent,
    type ReactionCreatedEvent,
    EventType,
    type BroadcastEvent,
    type AttachmentRemovedEvent,
    type MessageRemovedEvent,
    type ReactionRemovedEvent
} from '@communication/sdk-types'

import { BaseQuery } from '../query'

export class MessagesQuery extends BaseQuery<Message, FindMessagesParams> {
    override async find(params: FindMessagesParams): Promise<Message[]> {
        return this.client.findMessages(params, this.id)
    }

    override getObjectId(object: Message): ID {
        return object.id
    }

    override getObjectDate(object: Message): Date {
        return object.created
    }

    override async onEvent(event: BroadcastEvent): Promise<void> {
        switch (event.type) {
            case EventType.MessageCreated:
                return await this.onCreateMessageEvent(event)
            case EventType.MessageRemoved:
                return await this.onRemoveMessageEvent(event)
            case EventType.PatchCreated:
                return await this.onCreatePatchEvent(event)
            case EventType.ReactionCreated:
                return await this.onCreateReactionEvent(event)
            case EventType.ReactionRemoved:
                return await this.onRemoveReactionEvent(event)
            case EventType.AttachmentCreated:
                return await this.onCreateAttachmentEvent(event)
            case EventType.AttachmentRemoved:
                return await this.onRemoveAttachmentEvent(event)
        }
    }

    async onCreateMessageEvent(event: MessageCreatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const message = {
            ...event.message,
            edited: new Date(event.message.edited),
            created: new Date(event.message.created)
        }
        const exists = this.result.get(message.id)

        if (exists !== undefined) return
        if (!this.match(message, event.card)) return

        if (this.result.isTail()) {
            if (this.params.sort === SortOrder.Asc) {
                this.result.push(message)
            } else {
                this.result.unshift(message)
            }
            await this.notify()
        }
    }

    private match(message: Message, card: CardID): boolean {
        if (this.params.id != null && this.params.id !== message.id) {
            return false
        }
        if (this.params.card != null && this.params.card !== card) {
            return false
        }
        return true
    }

    private async onCreatePatchEvent(event: PatchCreatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const patch = {
            ...event.patch,
            created: new Date(event.patch.created)
        }

        const message = this.result.get(patch.message)

        if (message === undefined) return

        if (message.created < patch.created) {
            this.result.update(this.applyPatch(message, patch))
            await this.notify()
        }
    }

    private async onRemoveMessageEvent(event: MessageRemovedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const deleted = this.result.delete(event.message)

        if (deleted !== undefined) {
            await this.notify()
        }
    }

    private async onCreateReactionEvent(event: ReactionCreatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const reaction = {
            ...event.reaction,
            created: new Date(event.reaction.created)
        }
        const message = this.result.get(reaction.message)
        if (message === undefined) return

        message.reactions.push(reaction)
        this.result.update(message)
        await this.notify()
    }

    private async onRemoveReactionEvent(event: ReactionRemovedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const message = this.result.get(event.message)
        if (message === undefined) return

        const reactions = message.reactions.filter((it) => it.reaction !== event.reaction && it.creator !== event.creator)
        if (reactions.length === message.reactions.length) return

        const updated = {
            ...message,
            reactions
        }
        this.result.update(updated)
        await this.notify()
    }

    private async onCreateAttachmentEvent(event: AttachmentCreatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const attachment = {
            ...event.attachment,
            created: new Date(event.attachment.created)
        }
        const message = this.result.get(attachment.message)
        if (message === undefined) return

        message.attachments.push(attachment)
        this.result.update(message)
        await this.notify()
    }

    private async onRemoveAttachmentEvent(event: AttachmentRemovedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const message = this.result.get(event.message)
        if (message === undefined) return

        const attachments = message.attachments.filter((it) => it.card !== event.card)
        if (attachments.length === message.attachments.length) return

        const updated = {
            ...message,
            attachments
        }
        this.result.update(updated)
        await this.notify()
    }

    private applyPatch(message: Message, patch: Patch): Message {
        return {
            ...message,
            content: patch.content,
            creator: patch.creator,
            created: patch.created
        }
    }
}
