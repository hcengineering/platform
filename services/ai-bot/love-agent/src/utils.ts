import { Room } from '@livekit/rtc-node'

import * as stream from './stream/stt.js'
import { Stt } from './type.js'

export function getStt (room: Room, workspace: string, token: string): Stt | undefined {
  return new stream.STT(room, workspace, token)
}
