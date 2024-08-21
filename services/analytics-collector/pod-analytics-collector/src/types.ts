import { ChatMessage, InlineButton, Channel } from '@hcengineering/chunter'
import { Ref } from '@hcengineering/core'
import { OnboardingChannel } from '@hcengineering/analytics-collector'

export interface Action {
  _id: Ref<InlineButton>
  name: string
  messageId: Ref<ChatMessage>
  channelId: Ref<Channel>
}

export enum MessageActions {
  Accept = 'accept'
}

export interface OnboardingMessage {
  messageId: Ref<ChatMessage>
  channelId: Ref<OnboardingChannel>
}
