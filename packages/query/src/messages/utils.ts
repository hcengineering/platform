import type { CardID, Message, Reaction, SocialID } from '@hcengineering/communication-types'

export function addReaction (message: Message, reaction: Reaction): Message {
  message.reactions.push(reaction)
  return message
}

export function removeReaction (message: Message, emoji: string, creator: SocialID): Message {
  const reactions = message.reactions.filter((it) => it.reaction !== emoji || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}

export function addReply (message: Message, thread: CardID, created: Date): Message {
  if (message.thread === undefined) {
    return {
      ...message,
      thread: {
        card: message.card,
        message: message.id,
        thread,
        repliesCount: 1,
        lastReply: created
      }
    }
  }

  if (message.thread.thread !== thread) return message

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: message.thread.repliesCount + 1,
      lastReply: created
    }
  }
}

export function removeReply (message: Message, thread: CardID): Message {
  if (message.thread === undefined || message.thread.thread !== thread) return message

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: message.thread.repliesCount - 1
    }
  }
}
