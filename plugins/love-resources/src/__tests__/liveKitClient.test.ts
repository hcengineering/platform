//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import { SimpleNotification } from '@hcengineering/view-resources'
import { LiveKitClient } from '../liveKitClient'
import love from '../plugin'

jest.mock('livekit-client', () => ({
  Room: jest.fn(() => ({
    on: jest.fn(),
    localParticipant: { setScreenShareEnabled: jest.fn() }
  })),
  RoomEvent: { Connected: 'connected', Disconnected: 'disconnected' }
}))
jest.mock('@hcengineering/platform', () => ({ translate: jest.fn(async (key: string) => key) }))
jest.mock('@hcengineering/media', () => ({ getSelectedSpeakerId: jest.fn() }))
jest.mock('@hcengineering/love', () => ({}))
jest.mock('@hcengineering/media-resources', () => ({}))
jest.mock('svelte/store', () => ({ writable: jest.fn() }))
jest.mock('@hcengineering/analytics', () => ({}))
jest.mock('@hcengineering/ui', () => ({
  addNotification: jest.fn(),
  NotificationSeverity: { Error: 'error' }
}))
jest.mock('@hcengineering/view-resources', () => ({ SimpleNotification: {} }))
jest.mock('@hcengineering/theme', () => ({ getCurrentLanguage: () => 'en' }))
jest.mock('../components/meeting/LastParticipantNotification.svelte', () => ({}))
jest.mock('../plugin', () => ({
  __esModule: true,
  default: {
    string: {
      ScreenShareFailed: 'love:string:ScreenShareFailed',
      ScreenShareDenied: 'love:string:ScreenShareDenied',
      ScreenShareUnsupported: 'love:string:ScreenShareUnsupported',
      ScreenShareError: 'love:string:ScreenShareError'
    }
  }
}))
jest.mock('../stores', () => ({}))
jest.mock('../meetings', () => ({}))

describe('LiveKitClient screen share notifications', () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

  beforeAll(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getDisplayMedia: jest.fn() } }
    })
  })

  afterAll(() => {
    if (navigatorDescriptor !== undefined) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'navigator')
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each([
    '',
    'Permission denied',
    'The request is not allowed by the user agent or the platform in the current context.'
  ])('does not show a toast for a cancelled source picker (%s)', async (message) => {
    const client = new LiveKitClient()
    const error = new Error(message)
    error.name = 'NotAllowedError'
    jest.spyOn(client.liveKitRoom.localParticipant, 'setScreenShareEnabled').mockRejectedValue(error)

    await client.setScreenShareEnabled(true)

    expect(addNotification).not.toHaveBeenCalled()
  })

  it.each([
    ['NotAllowedError', 'Permission denied by system'],
    ['NotAllowedError', 'Access to the feature "display-capture" is disallowed by permission policy.'],
    ['NotAllowedError', 'Blocked by permissions policy'],
    ['SecurityError', 'Insecure context']
  ])('shows a toast when screen sharing is blocked (%s: %s)', async (name, message) => {
    const client = new LiveKitClient()
    const error = new Error(message)
    error.name = name
    jest.spyOn(client.liveKitRoom.localParticipant, 'setScreenShareEnabled').mockRejectedValue(error)

    await client.setScreenShareEnabled(true)

    expect(addNotification).toHaveBeenCalledTimes(1)
    expect(addNotification).toHaveBeenCalledWith(
      love.string.ScreenShareFailed,
      love.string.ScreenShareDenied,
      SimpleNotification,
      undefined,
      NotificationSeverity.Error,
      'love'
    )
  })
})
