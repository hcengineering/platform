import { ChatMessage } from '@hcengineering/chunter'
import { Ref } from '@hcengineering/core'
import { OnboardingChannel } from '@hcengineering/analytics-collector'

export interface OnboardingMessage {
  messageId: Ref<ChatMessage>
  channelId: Ref<OnboardingChannel>
}
