import { Room } from '@livekit/rtc-node'

import * as dg from './deepgram/stt.js'
import * as openai from './openai/stt.js'
import config from './config.js'
import { Stt } from './type.js'

export function getStt (room: Room): Stt | undefined {
  const provider = config.SttProvider

  switch (provider) {
    case 'deepgram':
      return new dg.STT(room)
    case 'openai':
      return new openai.STT(room)
  }
}
