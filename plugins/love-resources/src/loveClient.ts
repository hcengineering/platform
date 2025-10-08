import { concatLink } from '@hcengineering/core'
import love, { type Room } from '@hcengineering/love'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getPlatformToken, lk } from './utils'
import { getCurrentEmployee } from '@hcengineering/contact'
import { getPersonByPersonRef } from '@hcengineering/contact-resources'
import { Analytics } from '@hcengineering/analytics'
import { currentMeetingMinutes } from './meetings'
import { get } from 'svelte/store'

export function getLoveClient (): LoveClient {
  return new LoveClient()
}

export class LoveClient {
  async getRoomToken (room: Room): Promise<string> {
    return await this.refreshRoomToken(room)
  }

  async updateSessionLanguage (room: Room): Promise<void> {
    try {
      const endpoint = this.getLoveEndpoint()
      const token = getPlatformToken()
      const roomName = this.getTokenRoomName(room)

      await fetch(concatLink(endpoint, '/language'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomName, room: room.name, language: room.language })
      })
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
  }

  async record (room: Room): Promise<void> {
    try {
      const endpoint = this.getLoveEndpoint()
      const token = getPlatformToken()
      const roomName = this.getTokenRoomName(room)
      if (lk.isRecording) {
        await fetch(concatLink(endpoint, '/stopRecord'), {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ roomName, room: room.name })
        })
      } else {
        await fetch(concatLink(endpoint, '/startRecord'), {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ roomName, room: room.name, meetingMinutes: get(currentMeetingMinutes)?._id })
        })
      }
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
  }

  private getLoveEndpoint (): string {
    const endpoint = getMetadata(love.metadata.ServiceEnpdoint)
    if (endpoint === undefined) {
      throw new Error('Love service endpoint not found')
    }

    return endpoint
  }

  private async refreshRoomToken (room: Room): Promise<string> {
    const sessionName = this.getTokenRoomName(room)
    const endpoint = this.getLoveEndpoint()
    if (endpoint === undefined) {
      throw new Error('Love service endpoint not found')
    }
    const myPerson = await getPersonByPersonRef(getCurrentEmployee())
    if (myPerson == null) {
      throw new Error('Cannot find current person')
    }
    const platformToken = getPlatformToken()
    const res = await fetch(concatLink(endpoint, '/getToken'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${platformToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomName: sessionName, _id: myPerson._id, participantName: myPerson.name })
    })
    return await res.text()
  }

  private getTokenRoomName (room: Room): string {
    const currentWorkspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid)
    if (currentWorkspaceUuid === undefined) {
      throw new Error('Current workspace not found')
    }
    return `${currentWorkspaceUuid}_${room.name}_${room._id}`
  }
}
