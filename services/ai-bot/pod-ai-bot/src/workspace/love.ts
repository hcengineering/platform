//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { ConnectMeetingRequest } from '@hcengineering/ai-bot'
import chunter from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import core, {
  concatLink,
  Doc,
  Markup,
  MeasureContext,
  PersonId,
  Ref,
  TxCreateDoc,
  TxCUD,
  TxOperations,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceUuid,
  pickPrimarySocialId,
  AccountUuid
} from '@hcengineering/core'
import love, {
  getFreeRoomPlace,
  MeetingMinutes,
  MeetingStatus,
  ParticipantInfo,
  Room,
  RoomLanguage,
  TranscriptionStatus
} from '@hcengineering/love'
import { jsonToMarkup, MarkupNodeType } from '@hcengineering/text'

import config from '../config'

export class LoveController {
  private readonly connectedRooms = new Set<Ref<Room>>()

  private participantsInfo: ParticipantInfo[] = []
  private rooms: Room[] = []
  private readonly socialIdByPerson = new Map<Ref<Person>, PersonId>()
  private meetingMinutes: MeetingMinutes[] = []

  constructor (
    private readonly workspace: WorkspaceUuid,
    private readonly ctx: MeasureContext,
    private readonly token: string,
    private readonly client: TxOperations,
    private readonly currentPerson: Person
  ) {
    void this.initData()
    setInterval(() => {
      void this.checkConnection()
    }, 10 * 1000)
  }

  getIdentity (): { identity: Ref<Person>, name: string } {
    return {
      identity: this.currentPerson._id,
      name: this.currentPerson.name
    }
  }

  txHandler (txes: TxCUD<Doc>[]): void {
    const hierarchy = this.client.getHierarchy()
    for (const etx of txes) {
      if (!hierarchy.isDerived(etx._class, core.class.TxCUD)) continue
      if (etx._class === core.class.TxCreateDoc) {
        if (etx.objectClass === love.class.ParticipantInfo) {
          this.participantsInfo.push(TxProcessor.createDoc2Doc(etx as TxCreateDoc<ParticipantInfo>))
        } else if (etx.objectClass === love.class.Room) {
          this.rooms.push(TxProcessor.createDoc2Doc(etx as TxCreateDoc<Room>))
        }
      } else if (etx._class === core.class.TxRemoveDoc) {
        if (etx.objectClass === love.class.ParticipantInfo) {
          this.participantsInfo = this.participantsInfo.filter((p) => p._id !== etx.objectId)
        } else if (etx.objectClass === love.class.Room) {
          this.rooms = this.rooms.filter((r) => r._id !== etx.objectId)
        }
      } else if (etx._class === core.class.TxUpdateDoc) {
        if (etx.objectClass === love.class.ParticipantInfo) {
          this.participantsInfo = this.participantsInfo.map((p) => {
            if (p._id === etx.objectId) {
              return TxProcessor.updateDoc2Doc(p, etx as TxUpdateDoc<ParticipantInfo>)
            }
            return p
          })
        } else if (etx.objectClass === love.class.Room) {
          this.rooms = this.rooms.map((r) => {
            if (r._id === etx.objectId) {
              return TxProcessor.updateDoc2Doc(r, etx as TxUpdateDoc<Room>)
            }
            return r
          })
        }
      }
    }
  }

  async initData (): Promise<void> {
    this.participantsInfo = await this.client.findAll(love.class.ParticipantInfo, {})
    this.rooms = await this.client.findAll(love.class.Room, {})

    for (const p of this.participantsInfo) {
      if (p.person === this.currentPerson._id) {
        await this.client.remove(p)
      }
    }
  }

  async checkConnection (): Promise<void> {
    if (this.connectedRooms.size === 0) return

    for (const room of this.connectedRooms) {
      const roomParticipants = this.participantsInfo.filter(
        (p) => p.room === room && p.person !== this.currentPerson._id
      )
      if (roomParticipants.length === 0) {
        void this.disconnect(room)
      }
    }
  }

  async connect (request: ConnectMeetingRequest): Promise<void> {
    const room = await this.getRoom(request.roomId)

    if (room === undefined) {
      this.ctx.error('Room not found', request)
      this.connectedRooms.delete(request.roomId)
      return
    }

    this.connectedRooms.add(request.roomId)

    this.ctx.info('Connecting', { room: room.name, roomId: room._id })

    if (request.transcription) {
      await this.requestTranscription(room, request.language)
    }

    await this.createAiParticipant(room)
  }

  async requestTranscription (room: Room, language: RoomLanguage): Promise<void> {
    const roomTokenName = getTokenRoomName(this.workspace, room.name, room._id)
    await startTranscription(this.token, roomTokenName, room.name, language)
  }

  async disconnect (roomId: Ref<Room>): Promise<void> {
    this.ctx.info('Disconnecting', { roomId })

    const participant = await this.getRoomParticipant(roomId, this.currentPerson._id)
    if (participant !== undefined) {
      await this.client.remove(participant)
    }

    const room = await this.getRoom(roomId)

    if (room !== undefined) {
      await stopTranscription(this.token, getTokenRoomName(this.workspace, room.name, room._id), room.name)
    }

    this.meetingMinutes = this.meetingMinutes.filter((m) => m.attachedTo !== roomId)
    this.connectedRooms.delete(roomId)
  }

  async getSocialId (person: Ref<Person>): Promise<PersonId | undefined> {
    if (!this.socialIdByPerson.has(person)) {
      const identities = await this.client.findAll(contact.class.SocialIdentity, {
        attachedTo: person,
        attachedToClass: contact.class.Person,
        verifiedOn: { $gt: 0 }
      })
      if (identities.length > 0) {
        const id = pickPrimarySocialId(identities)._id
        this.socialIdByPerson.set(person, id)
      }
    }

    const socialId = this.socialIdByPerson.get(person)
    if (socialId === undefined) {
      return
    }

    this.socialIdByPerson.set(person, socialId)

    return socialId
  }

  async processTranscript (text: string, person: Ref<Person>, roomId: Ref<Room>): Promise<void> {
    const room = await this.getRoom(roomId)
    const participant = await this.getRoomParticipant(roomId, person)

    if (room === undefined || participant === undefined) {
      return
    }

    const socialId = await this.getSocialId(person)
    if (socialId === undefined) return

    const doc = await this.getMeetingMinutes(room)
    if (doc === undefined) return

    const op = this.client.apply(undefined, undefined, true)

    await op.addCollection(
      chunter.class.ChatMessage,
      core.space.Workspace,
      doc._id,
      doc._class,
      'transcription',
      {
        message: this.transcriptToMarkup(text)
      },
      undefined,
      undefined,
      socialId
    )
    await op.commit()
  }

  hasActiveConnections (): boolean {
    return this.connectedRooms.size > 0
  }

  async getRoom (ref: Ref<Room>): Promise<Room | undefined> {
    return this.rooms.find(({ _id }) => _id === ref) ?? (await this.client.findOne(love.class.Room, { _id: ref }))
  }

  async getRoomParticipant (room: Ref<Room>, person: Ref<Person>): Promise<ParticipantInfo | undefined> {
    return (
      this.participantsInfo.find((p) => p.room === room && p.person === person) ??
      (await this.client.findOne(love.class.ParticipantInfo, { room, person }))
    )
  }

  async getMeetingMinutes (room: Room): Promise<MeetingMinutes | undefined> {
    const doc =
      this.meetingMinutes.find((m) => m.attachedTo === room._id && m.status === MeetingStatus.Active) ??
      (await this.client.findOne(love.class.MeetingMinutes, { attachedTo: room._id, status: MeetingStatus.Active }))

    if (doc === undefined) {
      return undefined
    }

    this.meetingMinutes.push(doc)
    return doc
  }

  async createAiParticipant (room: Room): Promise<Ref<ParticipantInfo>> {
    const participants = await this.client.findAll(love.class.ParticipantInfo, { room: room._id })
    const currentInfo = participants.find((p) => p.person === this.currentPerson._id)

    if (currentInfo !== undefined) return currentInfo._id

    const place = getFreeRoomPlace(room, participants, this.currentPerson._id)
    const x: number = place.x
    const y: number = place.y

    return await this.client.createDoc(love.class.ParticipantInfo, core.space.Workspace, {
      x,
      y,
      room: room._id,
      person: this.currentPerson._id,
      name: this.currentPerson.name,
      account: (this.currentPerson.personUuid as AccountUuid) ?? null,
      sessionId: null
    })
  }

  transcriptToMarkup (transcript: string): Markup {
    return jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: transcript
            }
          ]
        }
      ]
    })
  }
}

function getTokenRoomName (workspace: WorkspaceUuid, roomName: string, roomId: Ref<Room>): string {
  return `${workspace}_${roomName}_${roomId}`
}

async function startTranscription (
  token: string,
  roomTokenName: string,
  roomName: string,
  language: RoomLanguage
): Promise<boolean> {
  try {
    const endpoint = config.LoveEndpoint
    const res = await fetch(concatLink(endpoint, '/transcription'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomName: roomTokenName,
        room: roomName,
        language,
        transcription: TranscriptionStatus.InProgress
      })
    })
    return res.ok
  } catch (err: any) {
    console.error('Failed to request start transcription', err)
    return false
  }
}

async function stopTranscription (token: string, roomTokenName: string, roomName: string): Promise<boolean> {
  try {
    const endpoint = config.LoveEndpoint
    const res = await fetch(concatLink(endpoint, '/transcription'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomName: roomTokenName, room: roomName, transcription: TranscriptionStatus.Idle })
    })
    return res.ok
  } catch (err: any) {
    console.error('Failed to request stop transcription', err)
    return false
  }
}
