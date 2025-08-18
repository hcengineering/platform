import { location } from '@hcengineering/ui'

let key = ''

let bc: BroadcastChannel | undefined

location.subscribe((newLocation) => {
  if (newLocation.path?.[2] !== undefined && 'BroadcastChannel' in window) {
    const newKey = 'love' + newLocation.path[2]
    if (key !== newKey) {
      key = newKey
      bc?.close()
      bc = new BroadcastChannel(key)
      bc.onmessage = onMessage
      sendMessage({ type: 'status_ask' })
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

function sendMessage (req: BroadcastMessage): void {
  bc?.postMessage(req)
}

async function onMessage (e: MessageEvent<BroadcastMessage>): Promise<void> {
  /*
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
  */
}
