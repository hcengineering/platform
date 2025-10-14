import { PlatformError, unknownError } from '@hcengineering/platform'
import * as inspector from 'node:inspector'

let session: inspector.Session | undefined
export function profileStart (): void {
  try {
    session = new inspector.Session()
    session.connect()

    session.post('Profiler.enable')
    session.post('Profiler.start')
  } catch (err) {
    console.error(err)
  }
}

export async function profileStop (): Promise<string | undefined> {
  return await new Promise<string | undefined>((resolve, reject) => {
    if (session == null) {
      reject(new PlatformError(unknownError('no session started')))
      return
    }
    try {
      session.post('Profiler.stop', (err, profile) => {
        if (err != null) {
          reject(err)
        } else {
          const json = JSON.stringify(profile.profile)
          session?.disconnect()
          session = undefined
          resolve(json)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}
