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

import { Unsubscriber, get } from 'svelte/store'

import { getCurrentAccount } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import support, {
  SupportClient,
  SupportStatusCallback,
  SupportSystem,
  SupportWidget,
  SupportWidgetConfig
} from '@hcengineering/support'
import { location, themeStore } from '@hcengineering/ui'
import { createQuery, LiveQuery, getClient } from '@hcengineering/presentation'

class SupportClientImpl implements SupportClient {
  private readonly supportSystem: SupportSystem
  private readonly onStatusChanged: SupportStatusCallback | undefined

  private config: SupportWidgetConfig
  private widget: SupportWidget | undefined = undefined

  private hasUnreadMessages: boolean = false
  private widgetUnreadCount: number | undefined = undefined
  private widgetVisible = false

  private readonly query?: LiveQuery
  private readonly unsub?: Unsubscriber

  constructor (supportSystem: SupportSystem, onStatusChanged?: SupportStatusCallback) {
    this.supportSystem = supportSystem
    this.onStatusChanged = onStatusChanged

    this.config = {
      account: getCurrentAccount(),
      workspace: get(location).path[1],
      language: get(themeStore).language
    }
    this.updateWidgetConfig(this.config)

    if (onStatusChanged !== undefined) {
      const query = createQuery(true)
      query.query(
        support.class.SupportConversation,
        {
          createdBy: this.config.account._id
        },
        (res) => {
          this.hasUnreadMessages = res.some((p) => p.hasUnreadMessages)
          this.updateWidgetStatus()
        }
      )
    }

    this.unsub = themeStore.subscribe((theme) => {
      const config = { ...this.config, language: theme.language }
      this.updateWidgetConfig(config)
    })
  }

  destroy (): void {
    this.query?.unsubscribe()
    this.unsub?.()
    this.widget?.destroy()
  }

  async showWidget (): Promise<void> {
    await this.getWidget().then(async (widget) => await widget.showWidget())
  }

  async hideWidget (): Promise<void> {
    await this.widget?.hideWidget()
  }

  async toggleWidget (): Promise<void> {
    await this.getWidget().then(async (widget) => await widget.toggleWidget())
  }

  private updateWidgetConfig (config: SupportWidgetConfig): void {
    this.config = config
    this.widget?.configure(config)
  }

  private handleUnreadCountChanged (count: number): void {
    this.widgetUnreadCount = count
    this.updateWidgetStatus()
  }

  private handleVisibilityChanged (visible: boolean): void {
    this.widgetVisible = visible
    this.updateWidgetStatus()
  }

  private updateWidgetStatus (): void {
    if (this.onStatusChanged === undefined) return

    const visible = this.widgetVisible
    const hasUnreadMessages = this.widgetUnreadCount !== undefined ? this.widgetUnreadCount > 0 : this.hasUnreadMessages

    this.onStatusChanged({ visible, hasUnreadMessages })
  }

  private async getWidget (): Promise<SupportWidget> {
    if (this.widget === undefined) {
      const factory = await getResource(this.supportSystem.factory)
      this.widget = factory(
        this.config,
        (count: number) => this.handleUnreadCountChanged(count),
        (visible: boolean) => this.handleVisibilityChanged(visible)
      )
    }
    return await Promise.resolve(this.widget)
  }
}

let client: SupportClient | undefined

export async function createSupportClient (onStatusChanged?: SupportStatusCallback): Promise<SupportClient | undefined> {
  const supportSystem = await getClient().findOne(support.class.SupportSystem, {})

  if (supportSystem !== undefined) {
    client = new SupportClientImpl(supportSystem, onStatusChanged)
    return client
  }
}

export function getSupportClient (): SupportClient | undefined {
  if (client === undefined) {
    console.info('support client not initialized')
  }
  return client
}
