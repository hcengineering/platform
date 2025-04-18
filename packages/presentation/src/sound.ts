import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type Asset, getMetadata, getResource } from '@hcengineering/platform'
import { getClient } from '.'
import notification from '@hcengineering/notification'

const sounds = new Map<Asset, AudioBuffer>()
const context = new AudioContext()

export async function isNotificationAllowed (_class?: Ref<Class<Doc>>): Promise<boolean> {
  if (_class === undefined) return false
  const client = getClient()
  const notificationType = client
    .getModel()
    .findAllSync(notification.class.NotificationType, { objectClass: _class })[0]

  if (notificationType === undefined) return false

  const isAllowedFn = await getResource(notification.function.IsNotificationAllowed)
  return isAllowedFn(notificationType, notification.providers.SoundNotificationProvider)
}

export async function prepareSound (key: string): Promise<void> {
  try {
    const soundUrl = getMetadata(key as Asset) as string
    const rawAudio = await fetch(soundUrl)
    const rawBuffer = await rawAudio.arrayBuffer()
    const decodedBuffer = await context.decodeAudioData(rawBuffer)

    sounds.set(key as Asset, decodedBuffer)
  } catch (err) {
    console.error('Sound not found', key)
  }
}

export async function playSound (soundKey: string, loop = false): Promise<(() => void) | null> {
  const soundAssetKey = soundKey as Asset

  if (!sounds.has(soundAssetKey)) {
    await prepareSound(soundKey)
  }

  const sound = sounds.get(soundKey as Asset)
  if (sound === undefined) {
    console.error('Cannot prepare audio buffer', soundKey)
    return null
  }

  try {
    const audio = context.createBufferSource()
    audio.buffer = sound
    audio.loop = loop
    audio.connect(context.destination)
    audio.start()

    return (): void => {
      audio.stop()
      audio.disconnect(context.destination)
    }
  } catch (err) {
    console.error('Error when playing sound back', soundKey, err)
    return null
  }
}

export async function playNotificationSound (
  soundKey: string,
  _class?: Ref<Class<Doc>>,
  loop = false
): Promise<(() => void) | null> {
  const allowed = await isNotificationAllowed(_class)
  if (!allowed) return null
  return await playSound(soundKey, loop)
}
