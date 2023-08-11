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

import { Unsubscriber, get } from "svelte/store"

import { getCurrentAccount } from "@hcengineering/core"
import intercom from "@hcengineering/intercom"
import { getResource } from "@hcengineering/platform"
import { SupportClient, SupportWidget, SupportWidgetConfig } from "@hcengineering/support"
import { location, themeStore } from "@hcengineering/ui"


class SupportClientImpl implements SupportClient {

  private config: SupportWidgetConfig = {}
  private widget: SupportWidget | undefined = undefined
  private unsub: Unsubscriber | undefined = undefined

  constructor () {
    const config = {
      account: getCurrentAccount(),
      workspace: get(location).path[1],
      language: get(themeStore).language
    }
    this.updateWidgetConfig(config)

    this.unsub = themeStore.subscribe((theme) => {
      const config = { ...this.config, language: theme.language }
      this.updateWidgetConfig(config)
    })
  }

  destroy (): void {
    this.unsub?.()
    this.widget?.destroy()
  }

  async showWidget (): Promise<void> {
    await this.getWidget().then((widget) => widget.showWidget())
  }

  async hideWidget (): Promise<void> {
    this.widget?.hideWidget()
  }

  async toggleWidget (): Promise<void> {
    await this.getWidget().then((widget) => widget.toggleWidget())
  }

  private updateWidgetConfig(config: SupportWidgetConfig) {
    this.config = config
    this.widget?.configure(config)
  }

  private async getWidget (): Promise<SupportWidget> {
    if (this.widget === undefined) {
      this.widget = await getResource(intercom.function.GetWidget).then((res) => res(this.config))
    }
    return await Promise.resolve(this.widget) as SupportWidget
  }
}

let client: SupportClient | undefined = undefined

export function createSupportClient(): SupportClient {
  client = new SupportClientImpl()
  return client
}

export function getSupportClient(): SupportClient | undefined {
  if (client === undefined) {
    console.info('support client not initialized')
  }
  return client
}
