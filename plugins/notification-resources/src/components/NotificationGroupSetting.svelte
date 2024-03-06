<!--
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
-->
<script lang="ts">
  import { IdMap, Ref, toIdMap } from '@hcengineering/core'
  import type {
    BaseNotificationType,
    NotificationGroup,
    NotificationProvider,
    NotificationSetting,
    NotificationType
  } from '@hcengineering/notification'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Grid, Label, ToggleWithLabel } from '@hcengineering/ui'
  import notification from '../plugin'

  export let group: Ref<NotificationGroup>
  export let settings: Map<Ref<BaseNotificationType>, NotificationSetting[]>

  const client = getClient()
  let types: BaseNotificationType[] = []
  let typesMap: IdMap<BaseNotificationType> = new Map()
  let providers: NotificationProvider[] = []
  let providersMap: IdMap<NotificationProvider> = new Map()

  void load()

  const query = createQuery()
  $: query.query(notification.class.BaseNotificationType, { group }, (res) => {
    types = res
    typesMap = toIdMap(types)
  })

  async function load () {
    providers = await client.findAll(notification.class.NotificationProvider, {})
    providersMap = toIdMap(providers)
  }

  $: column = providers.length + 1

  function getStatus (
    settings: Map<Ref<BaseNotificationType>, NotificationSetting[]>,
    type: Ref<BaseNotificationType>,
    provider: Ref<NotificationProvider>
  ): boolean {
    const setting = getSetting(settings, type, provider)
    if (setting !== undefined) return setting.enabled
    const prov = providersMap.get(provider)
    if (prov === undefined) return false
    const typeValue = typesMap.get(type)
    if (typeValue === undefined) return false
    return typeValue?.providers?.[provider] ?? false
  }

  function createHandler (type: Ref<BaseNotificationType>, provider: Ref<NotificationProvider>): (evt: any) => void {
    return (evt: any) => {
      void change(type, provider, evt.detail)
    }
  }

  async function change (
    type: Ref<BaseNotificationType>,
    provider: Ref<NotificationProvider>,
    value: boolean
  ): Promise<void> {
    const current = getSetting(settings, type, provider)
    if (current === undefined) {
      await client.createDoc(notification.class.NotificationSetting, notification.space.Notifications, {
        attachedTo: provider,
        type,
        enabled: value
      })
    } else {
      await client.update(current, {
        enabled: value
      })
    }
  }

  function getSetting (
    map: Map<Ref<BaseNotificationType>, NotificationSetting[]>,
    type: Ref<BaseNotificationType>,
    provider: Ref<NotificationProvider>
  ): NotificationSetting | undefined {
    const typeMap = map.get(type)
    if (typeMap === undefined) return
    return typeMap.find((p) => p.attachedTo === provider)
  }

  const isNotificationType = (type: BaseNotificationType): type is NotificationType => {
    return type._class === notification.class.NotificationType
  }

  function getLabel (type: BaseNotificationType): IntlString {
    if (isNotificationType(type) && type.attachedToClass !== undefined) {
      return notification.string.AddedRemoved
    }

    return notification.string.Change
  }
</script>

<div class="container">
  <Grid {column} columnGap={5} rowGap={1.5}>
    {#each types as type}
      <div class="flex">
        {#if type.generated}
          <Label label={getLabel(type)} />:
        {/if}
        <Label label={type.label} />
      </div>
      {#each providers as provider (provider._id)}
        {#if type.providers[provider._id] !== undefined}
          <div class="toggle">
            <ToggleWithLabel
              label={provider.label}
              on={getStatus(settings, type._id, provider._id)}
              on:change={createHandler(type._id, provider._id)}
            />
          </div>
        {:else}
          <div />
        {/if}
      {/each}
    {/each}
  </Grid>
</div>

<style lang="scss">
  .container {
    width: fit-content;
  }

  .toggle {
    width: fit-content;
  }
</style>
