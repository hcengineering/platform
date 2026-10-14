import { Ref, WorkspaceUuid } from '@hcengineering/core'
import { MeetingMinutes, ParticipantMetadata, RoomMetadata } from '@hcengineering/love'
import { extractToken, Token } from '@hcengineering/server-token'
import { Request, Response } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import config from './config'

export function getWorkspaceId (req: Request): WorkspaceUuid | undefined {
  let decodedToken: Token | undefined
  try {
    decodedToken = extractToken(req.headers)
  } catch (e) {
    return undefined
  }

  if (decodedToken === undefined || decodedToken.extra?.readonly === 'true' || decodedToken.extra?.guest === 'true') {
    return undefined
  }
  return decodedToken.workspace
}

export function parseMetadata (metadata?: string | null): RoomMetadata {
  if (metadata === '' || metadata == null) return {}

  try {
    return JSON.parse(metadata) as RoomMetadata
  } catch (e) {
    return {}
  }
}

export function parseParticipantMetadata (metadata?: string | null): ParticipantMetadata {
  if (metadata === '' || metadata == null) return {}

  try {
    return JSON.parse(metadata) as ParticipantMetadata
  } catch (e) {
    return {}
  }
}

export function getRoomName (workspaceId: WorkspaceUuid, meetingId: Ref<MeetingMinutes>): string {
  return `${workspaceId}_${meetingId}`
}

export function decodeMeetingToken (
  req: Request<any>,
  res: Response<any>
): { workspaceId?: WorkspaceUuid, meetingId?: Ref<MeetingMinutes> } {
  const meetingId: Ref<MeetingMinutes> = req.body.meetingId
  if (typeof meetingId !== 'string') {
    res.status(400).send()
    return {}
  }

  const workspaceId = getWorkspaceId(req)
  if (workspaceId === undefined) {
    res.status(401).send()
    return {}
  }
  return { meetingId, workspaceId }
}

export async function createToken (
  roomName: string,
  _id: string,
  participantName: string,
  metadata?: string
): Promise<string> {
  const at = new AccessToken(config.ApiKey, config.ApiSecret, {
    identity: _id,
    name: participantName,
    metadata,
    // token to expire after 10 minutes
    ttl: '10m'
  })
  at.addGrant({
    roomJoin: true,
    room: roomName
  })

  return await at.toJwt()
}
