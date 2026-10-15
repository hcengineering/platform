//
// Copyright © 2026 TraceX SAS.
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

import { MeasureContext, readOnlyGuestAccountUuid, Ref } from '@hcengineering/core'
import love, { MeetingMinutes, MeetingStatus, ParticipantMetadata, Room, RoomAccess } from '@hcengineering/love'
import { RoomServiceClient } from 'livekit-server-sdk'
import { WorkspaceClient } from './workspaceClient'
import { isWorkspaceLoginInfo, WorkspaceLoginInfo } from '@hcengineering/account-client'
import { decodeToken, generateToken, readToken, Token } from '@hcengineering/server-token'
import config from './config'
import { Request, Response } from 'express'
import { createToken, decodeMeetingToken, getRoomName } from './utils'
import { getAccountClient } from '@hcengineering/server-client'
import { combineName } from '@hcengineering/contact'

export class GuestManager {
  constructor (
    readonly ctx: MeasureContext,
    readonly roomClient: RoomServiceClient
  ) {}

  async handleGuestToken (req: Request, res: Response): Promise<void> {
    const { meetingId, workspaceId } = decodeMeetingToken(req, res)
    if (meetingId == null || workspaceId == null) {
      return
    }

    try {
      // We also need workspace info to generate guest token with proper workspace claims, so validate token and workspace access first
      const token = readToken(req.headers)
      const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()
      if (!isWorkspaceLoginInfo(wsLoginInfo)) {
        res.status(401).send()
        return
      }
      res.status(200).send({
        token: await this.createGuestToken(meetingId, wsLoginInfo)
      })
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  }

  async createGuestToken (meetingId: Ref<MeetingMinutes>, wsLoginInfo: WorkspaceLoginInfo): Promise<string> {
    const wsClient = await WorkspaceClient.create(wsLoginInfo.workspace, this.ctx)
    const meetingDoc = await wsClient.findMeetingById(meetingId)
    if (meetingDoc === undefined) {
      throw new Error('Meeting not found')
    }

    const workspaceUrl = wsLoginInfo.workspaceUrl ?? ''
    // Sign the guest platform token with the platform SECRET (not the LiveKit API secret),
    // so it validates against the transactor for read-only guest access. Using ApiSecret
    // here would only work if operators set LIVEKIT_API_SECRET === SECRET, dangerously
    // conflating the two secrets.
    const guestToken = generateToken(
      readOnlyGuestAccountUuid,
      wsLoginInfo.workspace,
      { meetingId, workspaceUrl },
      config.Secret
    )

    return guestToken
  }

  async handleGuestInfo (req: Request, res: Response): Promise<void> {
    const guestToken = req.body.token

    if (typeof guestToken !== 'string') {
      res.status(400).send()
      return
    }

    try {
      let decoded: Token
      try {
        decoded = decodeToken(guestToken, true, config.Secret)
      } catch (err) {
        res.status(401).send({ error: 'Invalid or expired token' })
        return
      }

      const meetingId: Ref<MeetingMinutes> = decoded.extra?.meetingId
      const workspace = decoded.workspace
      const workspaceUrl = decoded.extra?.workspaceUrl ?? null

      if (typeof meetingId !== 'string' || typeof workspace !== 'string') {
        res.status(400).send({ error: 'Invalid token payload' })
        return
      }

      // Resolve meeting & room presence via workspace client and livekit room list
      const wsClient = await WorkspaceClient.create(workspace, this.ctx)
      const meetingDoc = await wsClient.findMeetingById(meetingId)
      if (meetingDoc === undefined) {
        res.status(404).send({ error: 'Meeting not found' })
        return
      }
      const meetingStatus = meetingDoc.status
      const roomName = getRoomName(workspace, meetingId)
      const rooms = await this.roomClient.listRooms([roomName])
      const roomFound = !(rooms === undefined || rooms.length === 0)

      res.status(200).send({
        meetingId,
        workspace,
        workspaceUrl,
        now: Date.now(),
        meetingScheduledDate: meetingDoc.meetingScheduledDate,
        meetingEnd: meetingDoc.meetingEnd,
        title: meetingDoc.title,
        meetingStatus,
        roomFound
      })
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  }

  async handleGuestJoin (req: Request, res: Response): Promise<void> {
    const guestToken = req.body.token
    const firstName = req.body.firstName
    const lastName = req.body.lastName
    const personToken = req.body.personToken

    if (typeof guestToken !== 'string') {
      res.status(400).send()
      return
    }

    try {
      // Validate guest token and extract meeting + workspace
      let decoded: Token
      try {
        decoded = decodeToken(guestToken, true, config.Secret)
      } catch (err) {
        res.status(401).send({ error: 'Invalid or expired token' })
        return
      }

      const meetingId: Ref<MeetingMinutes> = decoded.extra?.meetingId
      const workspace = decoded.workspace

      if (typeof meetingId !== 'string' || typeof workspace !== 'string') {
        res.status(400).send({ error: 'Invalid token payload' })
        return
      }
      // Resolve or create a Person for this guest (so webhook and ui can reliably reference a Person)
      const wsClient = await WorkspaceClient.create(workspace, this.ctx)

      const meetingDoc = await wsClient.findMeetingById(meetingId)
      if (meetingDoc === undefined) {
        res.status(404).send({ error: 'Meeting not found' })
        return
      }

      const roomName = getRoomName(workspace, meetingId)

      const isActive = meetingDoc.status === MeetingStatus.Active

      if (meetingDoc.status === MeetingStatus.Scheduled && !isActive) {
        res.status(403).send({
          error: 'Meeting has not started yet.'
        })
        return
      }

      if (meetingDoc.status === MeetingStatus.Finished) {
        res.status(403).send({
          error: 'Meeting has already finished.'
        })
        return
      }

      // Respect the room's current access level: a host who set the room to "Do Not
      // Disturb" (locked) must not remain joinable via a previously shared guest link.
      // Access is enforced server-side here rather than only in the UI. Knock rooms are
      // intentionally allowed — sharing a guest link is itself the host's authorization.
      if (meetingDoc.attachedToClass === love.class.Room) {
        const meetingRoom = await wsClient.findRoomById(meetingDoc.attachedTo as Ref<Room>)
        if (meetingRoom !== undefined && meetingRoom.access === RoomAccess.DND) {
          this.ctx.info('[guestJoin] Room is locked (DND), rejecting guest join', { roomName })
          res.status(403).send({ error: 'The room is locked by the host.' })
          return
        }
      }

      // Ensure LiveKit room exists
      const room = await this.roomClient.listRooms([roomName])
      if (room === undefined || room.length === 0) {
        this.ctx.info('No room found guest join, not possible to join', { roomName })
        res.status(404).send({
          error: 'Meeting room not found.'
        })
        return
      }
      // Try finding an existing person by name to avoid duplicates
      const personRef = await wsClient.ensurePersonByName(personToken, firstName, lastName)

      if (personRef === undefined) {
        // Repeated failures while creating a Person - do not fallback to ephemeral identity.
        this.ctx.error('[guestJoin] Failed to create Person for guest join after retries', { firstName, lastName })
        res.status(500).send({ error: 'Failed to create guest identity' })
        return
      }

      // Use the person's document id as LiveKit identity so webhooks can resolve the person
      this.ctx.info('[guestJoin] Using identity', { identity: personRef })
      // Mark this participant as a guest in the token metadata
      const guestMetadata = JSON.stringify({ isGuest: true } satisfies ParticipantMetadata)
      const roomToken = await createToken(roomName, personRef, combineName(firstName, lastName), guestMetadata)

      res.status(200).send({
        token: roomToken,
        wsUrl: config.LiveKitHost,
        roomName,
        person: personRef
      })
    } catch (e) {
      console.error(e)
      res.status(500).send()
    }
  }
}
