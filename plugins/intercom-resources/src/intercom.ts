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

import intercom from '@hcengineering/intercom'
import { getMetadata } from '@hcengineering/platform'

import { loadScript } from './widget'
import { SupportWidget, SupportWidgetConfig } from '@hcengineering/support'

class IntercomSupportWidget implements SupportWidget {
  private config: SupportWidgetConfig
  private initialized = false
  private visible = false
  private unreadCount = 0

  constructor (config: SupportWidgetConfig) {
    this.config = config
  }
  
  configure (config: SupportWidgetConfig): void {
    this.config = config

    if (this.initialized) {
      const intercomConfig = getIntercomConfig(config)
      window.Intercom('update', intercomConfig)
    }
  }

  showWidget (): void {
    this.initialize()
    window.Intercom('show')
  }

  hideWidget (): void {
    if (this.initialized) {
      window.Intercom('hide')
    }
  }

  toggleWidget (): void {
    if (this.visible) {
      this.hideWidget()
    } else {
      this.showWidget()
    }
  }

  destroy (): void {
    if (this.initialized) {
      window.Intercom('shutdown')
    }
  }

  initialize (): void {
    if (!this.initialized) {
      const config = getIntercomConfig(this.config)
      const appId = getMetadata(intercom.metadata.AppID)
  
      if (appId === undefined) {
        throw Error('AppID is not defined')
      }
  
      loadScript(appId, () => {
        window.Intercom('onHide', () => this.visible = false)
        window.Intercom('onShow', () => this.visible = true)
        window.Intercom('onUnreadCountChange', (count: number) => this.unreadCount = count)
        window.Intercom('boot', { app_id: appId, ...config })

        this.initialized = true
      })
    }
  }
}

function getIntercomConfig (config: SupportWidgetConfig): any {
  const appId = getMetadata(intercom.metadata.AppID)
  const apiUrl = getMetadata(intercom.metadata.ApiBaseURL)
  const secretKey = getMetadata(intercom.metadata.SecretKey)

  const account = config.account
  const language = config.language
  const workspace = config.workspace

  // TODO This is not a secret anymore, move this somewhere else
  const userHash = account !== undefined && secretKey !== undefined ? userHashHmac(account._id, secretKey) : undefined

  return {
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
    user_hash: userHash,
    workspace
  }
}

function userHashHmac (data: string, secret: string): string {
  return HmacSHA256(data, secret).toString()
}

export function getIntercomWidget (config: SupportWidgetConfig): SupportWidget {
  return new IntercomSupportWidget(config)
}
