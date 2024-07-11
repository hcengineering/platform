import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type Asset, getMetadata } from '@hcengineering/platform'
import { getClient } from '.'
import notification from '@hcengineering/notification'

const sounds = new Map<Asset, AudioBufferSourceNode>()
const context = new AudioContext()
export async function prepareSound (key: string, _class?: Ref<Class<Doc>>, loop = false, play = false): Promise<void> {
  const notificationType =
    _class !== undefined
      ? getClient().getModel().findAllSync(notification.class.NotificationType, { objectClass: _class })
      : undefined
  const notAllowed = notificationType?.[0].providers[notification.providers.SoundNotification] === false
  if (notificationType === undefined || notAllowed) {
    return
  }
  try {
    const soundUrl = getMetadata(key as Asset) as string
    const audioBuffer = await fetch(soundUrl)
      .then(async (res) => await res.arrayBuffer())
      .then(async (ArrayBuffer) => await context.decodeAudioData(ArrayBuffer))
    const audio = context.createBufferSource()
    audio.buffer = audioBuffer
    audio.loop = loop
    sounds.set(key as Asset, audio)
    if (play) {
      playSound(key)
    }
  } catch (err) {
    console.error('sound not found', key)
  }
}

export function playSound (soundKey: string, _class?: Ref<Class<Doc>>, loop = false): void {
  const sound = sounds.get(soundKey as Asset)
  if (sound !== undefined) {
    try {
      sound.connect(context.destination)
      sound.start()
    } catch (err) {
      console.error('error happened during sound play', soundKey, err)
    }
  } else {
    void prepareSound(soundKey, _class, loop, true)
  }
}

export function stopSound (soundKey: string): void {
  const sound = sounds.get(soundKey as Asset)
  if (sound !== undefined && sound?.context.state === 'running') {
    sound.stop()
    sound.disconnect(context.destination)
  }
}
