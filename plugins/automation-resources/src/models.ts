import { Action } from '@anticrm/view'

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
  action: Action
}
