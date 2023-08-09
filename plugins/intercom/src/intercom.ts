//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { HmacSHA256 } from 'crypto-js'
import { get, writable } from 'svelte/store'

import { Account } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import intercom from '.'
import { loadScript } from './widget'

/**
 * @public
 */
export type IntercomConfig = Intercom_.IntercomSettings

/**
 * @public
 */
export interface IntercomState {
  initialized: boolean
  visible: boolean
  unreadCount: number
  config: IntercomConfig
}

/**
 * @public
 */
export const intercomStore = writable<IntercomState>({
  initialized: false,
  visible: false,
  unreadCount: 0,
  config: {}
})

function patchIntercomStore (patch: Partial<IntercomState>): void {
  intercomStore.update((state) => ({ ...state, ...patch }))
}

/**
 * @public
 */
export function updateIntercom (account?: Account, language?: string): void {
  const config = getConfig(account, language)
  patchIntercomStore({ config })

  const state = get(intercomStore)
  if (state.initialized) {
    window.Intercom('update', config)
  }
}

/**
 * @public
 */
export function showIntercomMessenger (): void {
  initializeIntercom()

  window.Intercom('show')
}

/**
 * @public
 */
export function hideInercomMessenger (): void {
  const state = get(intercomStore)
  if (state.initialized) {
    window.Intercom('hide')
  }
}

/**
 * @public
 */
export function toggleIntercomMessenger (): void {
  const state = get(intercomStore)
  if (state.visible) {
    hideInercomMessenger()
  } else {
    showIntercomMessenger()
  }
}

/**
 * @public
 */
export function shutdownIntercom (): void {
  const state = get(intercomStore)
  if (state.initialized) {
    window.Intercom('shutdown')
  }
}

function initializeIntercom (): void {
  const state = get(intercomStore)

  if (!state.initialized) {
    const config = state.config
    const appId = getMetadata(intercom.metadata.AppID)

    if (appId === undefined) {
      throw Error('AppID is not defined')
    }

    loadScript(appId, () => {
      window.Intercom('onHide', () => patchIntercomStore({ visible: false }))
      window.Intercom('onShow', () => patchIntercomStore({ visible: true }))
      window.Intercom('onUnreadCountChange', (count: number) => patchIntercomStore({ unreadCount: count }))
      window.Intercom('boot', { app_id: appId, ...config })

      patchIntercomStore({ initialized: true })
    })
  }
}

function getConfig (account?: Account, language?: string): IntercomConfig {
  const appId = getMetadata(intercom.metadata.AppID)
  const apiUrl = getMetadata(intercom.metadata.ApiBaseURL)
  const secretKey = getMetadata(intercom.metadata.SecretKey)

  // TODO This is not a secret anymore, move this somewhere else
  const userHash = account !== undefined && secretKey !== undefined ? userHashHmac(account._id, secretKey) : undefined

  const config = {
    // app
    app_id: appId,
    api_base: apiUrl,
    // placement and appearance
    alignment: 'right',
    hide_default_launcher: true,
    language_override: language,
    // current user
    name: account?.name,
    email: account?.email,
    user_id: account?._id,
    user_hash: userHash
  }

  return config
}

function userHashHmac (data: string, secret: string): string {
  return HmacSHA256(data, secret).toString()
}
