import { Class, Doc, Ref } from '@hcengineering/core'
import { Asset } from '@hcengineering/platform'

export enum ActionTab {
  Add = 'Add',
  Chat = 'Chat',
  Content = 'Content',
  Dates = 'Dates',
  Move = 'Move',
  Sort = 'Sort',
  Tracker = 'Tracker'
}

export interface Trigger {
  action?: {
    context: 'context' | 'editor'
    target: Ref<Class<Doc>>
    label: string
    icon?: Asset
  }
}
