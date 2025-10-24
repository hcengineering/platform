import { Room } from '@livekit/rtc-node'

import * as dg from './deepgram/stt.js'
import * as openai from './openai/stt.js'
import config from './config.js'
import { Stt } from './type.js'

export function getStt (room: Room, worksapce: string): Stt | undefined {
  const provider = config.SttProvider

  switch (provider) {
    case 'deepgram':
      return new dg.STT(room, worksapce)
    case 'openai':
      return new openai.STT(room)
  }
}
