import type { AccountUuid, PersonId } from '@hcengineering/core'

export enum QueueUserEvent {
  login = 'login',
  logout = 'logout'
}

export interface QueueUserMessage {
  type: QueueUserEvent
  user: AccountUuid
}

export interface QueueUserLogin extends QueueUserMessage {
  type: QueueUserEvent.login | QueueUserEvent.logout
  sessions: number
  socialIds: PersonId[]
}

export const userEvents = {
  login: function userLogin (data: Omit<QueueUserLogin, 'type'>): QueueUserLogin {
    return {
      type: QueueUserEvent.login,
      ...data
    }
  },
  logout: function userLogout (data: Omit<QueueUserLogin, 'type'>): QueueUserLogin {
    return {
      type: QueueUserEvent.logout,
      ...data
    }
  }
}
