import { Asset } from '@anticrm/platform'

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
  action: {
    label: string
    icon: Asset
    mode: Array<'context' | 'editor'>
  }
}
