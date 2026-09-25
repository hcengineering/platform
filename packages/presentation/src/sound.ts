import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type Asset, getMetadata, getResource } from '@hcengineering/platform'
import { getClient } from '.'
import notification from '@hcengineering/notification'

const sounds = new Map<Asset, AudioBuffer>()
const resumeTimeoutMs = 1000
let context: AudioContext | undefined

function getAudioContext (): AudioContext {
  context ??= new AudioContext()
  return context
}

async function resumeAudioContext (context: AudioContext): Promise<boolean> {
  if (context.state === 'running') return true
  if (context.state === 'closed') return false

  // Calling resume before the document has received user activation can leave
  // its promise pending indefinitely because of the browser autoplay policy.
  if (navigator.userActivation?.hasBeenActive === false) return false

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const resumed = await Promise.race([
      context.resume().then(() => true),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          resolve(false)
        }, resumeTimeoutMs)
      })
    ])
    return resumed && context.state === 'running'
  } catch {
    return false
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

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
    const decodedBuffer = await getAudioContext().decodeAudioData(rawBuffer)

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
    const context = getAudioContext()
    if (!(await resumeAudioContext(context))) return null

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
