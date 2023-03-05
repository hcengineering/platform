<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
-->
<script lang="ts">
  import { getCurrentAccount, Ref, Space, TxProcessor } from '@hcengineering/core'
  import type { NotificationProvider, NotificationSetting, NotificationType } from '@hcengineering/notification'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Grid, Icon, Label, ToggleWithLabel } from '@hcengineering/ui'
  import notification from '../plugin'

  const accountId = getCurrentAccount()._id
  const typeQuery = createQuery()
  const providersQuery = createQuery()
  const settingsQuery = createQuery()
  const client = getClient()
  const space = accountId as string as Ref<Space>

  let disabled = true

  let types: NotificationType[] = []
  let providers: NotificationProvider[] = []
  let settings: Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>> = new Map<
    Ref<NotificationType>,
    Map<Ref<NotificationProvider>, NotificationSetting>
  >()
  let oldSettings: Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>> = new Map<
    Ref<NotificationType>,
    Map<Ref<NotificationProvider>, NotificationSetting>
  >()

  typeQuery.query(notification.class.NotificationType, { hidden: false }, (res) => (types = res))
  providersQuery.query(notification.class.NotificationProvider, {}, (res) => (providers = res))
  settingsQuery.query(notification.class.NotificationSetting, { space }, (res) => {
    settings = convertToMap(res)
    oldSettings = convertToMap(client.getHierarchy().clone(res))
  })

  function convertToMap (
    settings: NotificationSetting[]
  ): Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>> {
    const result = new Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>>()
    for (const setting of settings) {
      setSetting(result, setting)
    }
    return result
  }

  function change (type: Ref<NotificationType>, provider: Ref<NotificationProvider>, value: boolean): void {
    const current = getSetting(settings, type, provider)
    if (current === undefined) {
      const tx = client.txFactory.createTxCreateDoc(notification.class.NotificationSetting, space, {
        provider,
        type,
        enabled: value
      })
      const setting = TxProcessor.createDoc2Doc(tx)
      setSetting(settings, setting)
    } else {
      current.enabled = value
    }
    disabled = false
  }

  function getSetting (
    map: Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>>,
    type: Ref<NotificationType>,
    provider: Ref<NotificationProvider>
  ): NotificationSetting | undefined {
    const typeMap = map.get(type)
    if (typeMap === undefined) return
    return typeMap.get(provider)
  }

  function setSetting (
    result: Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>>,
    setting: NotificationSetting
  ): void {
    let typeMap = result.get(setting.type)
    if (typeMap === undefined) {
      typeMap = new Map<Ref<NotificationProvider>, NotificationSetting>()
      result.set(setting.type, typeMap)
    }
    typeMap.set(setting.provider, setting)
  }

  async function save (): Promise<void> {
    disabled = true
    const promises: Promise<any>[] = []
    for (const type of settings.values()) {
      for (const setting of type.values()) {
        const old = getSetting(oldSettings, setting.type, setting.provider)
        if (old === undefined) {
          promises.push(client.createDoc(setting._class, setting.space, setting))
        } else if (old.enabled !== setting.enabled) {
          promises.push(
            client.updateDoc(old._class, old.space, old._id, {
              enabled: setting.enabled
            })
          )
        }
      }
    }
    try {
      await Promise.all(promises)
    } catch (e) {
      console.log(e)
    }
  }

  $: column = providers.length + 1

  function getStatus (
    map: Map<Ref<NotificationType>, Map<Ref<NotificationProvider>, NotificationSetting>>,
    type: Ref<NotificationType>,
    provider: Ref<NotificationProvider>
  ): boolean {
    const setting = getSetting(map, type, provider)
    if (setting !== undefined) return setting.enabled
    const prov = providers.find((p) => p._id === provider)
    if (prov === undefined) return false
    return prov.default
  }
  const createHandler = (type: Ref<NotificationType>, provider: Ref<NotificationProvider>): ((evt: any) => void) => {
    return (evt: any) => change(type, provider, evt.detail)
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={notification.icon.Notifications} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={notification.string.Notifications} /></div>
  </div>
  <div class="flex-row-stretch flex-grow container">
    <div class="flex-col flex-grow">
      <div class="flex-grow">
        <Grid {column} columnGap={5} rowGap={1.5}>
          {#each types as type (type._id)}
            <Label label={type.label} />
            {#each providers as provider (provider._id)}
              <ToggleWithLabel
                label={provider.label}
                on={getStatus(settings, type._id, provider._id)}
                on:change={createHandler(type._id, provider._id)}
              />
            {/each}
          {/each}
        </Grid>
      </div>
      <div class="flex-row-reverse">
        <Button
          label={presentation.string.Save}
          {disabled}
          kind={'primary'}
          on:click={() => {
            save()
          }}
        />
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .container {
    padding: 3rem;
  }
</style>
