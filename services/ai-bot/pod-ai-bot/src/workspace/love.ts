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
import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import core, {
  concatLink,
  Doc,
  generateId,
  Markup,
  MeasureContext,
  PersonId,
  Ref,
  SortingOrder,
  Timestamp,
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

  /**
   * Create a placeholder message for pending transcription
   * Shows a spinning indicator while transcription is in progress
   * Returns the message ID for later update/deletion
   */
  async createTranscriptionPlaceholder (
    person: Ref<Person>,
    roomId: Ref<Room>,
    startTimeSec: number,
    endTimeSec: number,
    blobId: string
  ): Promise<Ref<ChatMessage> | undefined> {
    this.ctx.info('Creating transcription placeholder', { person, roomId, startTimeSec, endTimeSec, blobId })

    const room = await this.getRoom(roomId)
    if (room === undefined) {
      this.ctx.warn('Room not found for placeholder', { roomId })
      return undefined
    }

    const participant = await this.getRoomParticipant(roomId, person)
    if (participant === undefined) {
      this.ctx.warn('Participant not found for placeholder', { roomId, person })
      return undefined
    }

    const socialId = await this.getSocialId(person)
    if (socialId === undefined) {
      this.ctx.warn('SocialId not found for placeholder', { person })
      return undefined
    }

    const doc = await this.getMeetingMinutes(room)
    if (doc === undefined) {
      this.ctx.warn('MeetingMinutes not found for placeholder', { roomId, roomName: room.name })
      return undefined
    }

    // Format time as mm:ss
    const formatTime = (sec: number): string => {
      const minutes = Math.floor(sec / 60)
      const seconds = Math.floor(sec % 60)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const timeRange = `${formatTime(startTimeSec)} - ${formatTime(endTimeSec)}`

    // Create placeholder with spinning indicator emoji and audio link
    // 🎙️ indicates recording, ⏳ indicates processing
    const placeholderText = `🎙️ ⏳ ... (${timeRange})`

    const messageId = generateId<ChatMessage>()

    const op = this.client.apply(undefined, undefined, true)

    await op.addCollection(
      chunter.class.ChatMessage,
      core.space.Workspace,
      doc._id,
      doc._class,
      'transcription',
      {
        message: this.transcriptToMarkup(placeholderText)
      },
      messageId,
      undefined,
      socialId
    )
    await op.commit()

    return messageId
  }

  /**
   * Update placeholder message with actual transcription text
   * Or delete it if transcription is empty
   * @returns true if message was found and updated/deleted, false if not found
   */
  async updateTranscriptionMessage (messageId: Ref<ChatMessage>, text: string | null): Promise<boolean> {
    const message = await this.client.findOne(chunter.class.ChatMessage, { _id: messageId })

    if (message === undefined) {
      this.ctx.warn('Transcription placeholder message not found', { messageId })
      return false
    }

    if (text === null || text.trim() === '') {
      // Delete message if no transcription
      await this.client.remove(message)
      this.ctx.info('Deleted empty transcription placeholder', { messageId })
    } else {
      // Update with actual transcription
      await this.client.update(message, {
        message: this.transcriptToMarkup(text)
      })
      this.ctx.info('Updated transcription message', { messageId, textLength: text.length })
    }
    return true
  }

  /**
   * Create a transcription message with specific timestamp (for fallback when placeholder not found)
   * Works even if meeting is already finished
   */
  async createTranscriptionMessageWithTimestamp (
    text: string,
    person: Ref<Person>,
    roomId: Ref<Room>,
    timestamp: Timestamp
  ): Promise<boolean> {
    const room = await this.getRoom(roomId)
    if (room === undefined) {
      this.ctx.warn('Room not found for fallback transcription', { roomId })
      return false
    }

    const socialId = await this.getSocialId(person)
    if (socialId === undefined) {
      this.ctx.warn('Social ID not found for fallback transcription', { person })
      return false
    }

    // Find MeetingMinutes for this room (including Finished ones)
    const doc = await this.getMeetingMinutesAny(room)
    if (doc === undefined) {
      this.ctx.warn('No MeetingMinutes found for fallback transcription', { roomId })
      return false
    }

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
      timestamp,
      socialId
    )
    await op.commit()

    this.ctx.info('Created fallback transcription message with timestamp', {
      roomId,
      person,
      textLength: text.length,
      timestamp
    })
    return true
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
    this.ctx.info('Added transcription message to meeting minutes', {
      roomId: room._id,
      meetingMinutes: doc._id,
      textLength: text.length
    })
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

  /**
   * Get MeetingMinutes for room regardless of status (Active or Finished)
   * Returns the most recent one if multiple exist
   */
  async getMeetingMinutesAny (room: Room): Promise<MeetingMinutes | undefined> {
    // First try to find in cache
    const cached = this.meetingMinutes.find((m) => m.attachedTo === room._id)
    if (cached !== undefined) {
      return cached
    }

    // Find the most recent meeting minutes for this room (any status)
    const doc = await this.client.findOne(
      love.class.MeetingMinutes,
      { attachedTo: room._id },
      { sort: { createdOn: SortingOrder.Descending } }
    )

    if (doc !== undefined) {
      this.meetingMinutes.push(doc)
    }

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
