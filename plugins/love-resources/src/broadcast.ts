import { get } from 'svelte/store'
import {
  isCameraEnabled,
  isConnected,
  $isCurrentInstanceConnected,
  isMicEnabled,
  isSharingEnabled,
  setCam,
  setMic,
  setShare
} from './utils'
import { getCurrentLocation, location } from '@hcengineering/ui'

let key = 'love' + getCurrentLocation().path?.[2]

let bc: BroadcastChannel | undefined

location.subscribe((newLocation) => {
  if (newLocation.path?.[2] !== undefined && 'BroadcastChannel' in window) {
    const newKey = 'love' + newLocation.path[2]
    if (key !== newKey) {
      key = newKey
      bc = new BroadcastChannel(key)
    }
  }
})

type BroadcastMessage =
  | BroadcastConnectMessage
  | BroadcastChangeHostMessage
  | BroadcastStatusAskMessage
  | BroadcastSetMessage
  | BroadcastStatusMessage

interface BroadcastConnectMessage {
  type: 'connect'
  value: boolean
}

interface BroadcastChangeHostMessage {
  type: 'change_host'
}

interface BroadcastStatusAskMessage {
  type: 'status_ask'
}

interface BroadcastSetMessage {
  type: 'set_mic' | 'set_cam' | 'set_share'
  value: boolean
}

interface BroadcastStatusMessage {
  type: 'mic' | 'cam' | 'share'
  value: boolean
}

export function sendMessage (req: BroadcastMessage): void {
  bc?.postMessage(req)
}

if (bc !== undefined) {
  bc.onmessage = async (e: MessageEvent<BroadcastMessage>) => {
    if (e.data.type === 'set_mic') {
      if ($isCurrentInstanceConnected) {
        await setMic(e.data.value)
      }
    }
    if (e.data.type === 'set_cam') {
      if ($isCurrentInstanceConnected) {
        await setCam(e.data.value)
      }
    }
    if (e.data.type === 'set_share') {
      if ($isCurrentInstanceConnected) {
        await setShare(e.data.value)
      }
    }
    if (e.data.type === 'share') {
      isSharingEnabled.set(e.data.value)
    }
    if (e.data.type === 'mic') {
      isMicEnabled.set(e.data.value)
    }
    if (e.data.type === 'cam') {
      isCameraEnabled.set(e.data.value)
    }
    if (e.data.type === 'status_ask') {
      if ($isCurrentInstanceConnected) {
        sendMessage({ type: 'connect', value: true })
        sendMessage({ type: 'mic', value: get(isMicEnabled) })
        sendMessage({ type: 'cam', value: get(isCameraEnabled) })
        sendMessage({ type: 'share', value: get(isSharingEnabled) })
      }
    }
    if (e.data.type === 'connect') {
      if (!$isCurrentInstanceConnected) {
        isConnected.set(e.data.value)
      }
    }
  }
}

sendMessage({ type: 'status_ask' })
