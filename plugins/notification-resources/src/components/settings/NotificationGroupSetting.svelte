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
  import core, { IdMap, Ref, toIdMap } from '@hcengineering/core'
  import {
    BaseNotificationType,
    NotificationProvider,
    NotificationGroup,
    NotificationType,
    NotificationTypeSetting,
    NotificationProviderDefaults,
    NotificationProviderSetting
  } from '@hcengineering/notification'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Grid, Label, ModernToggle } from '@hcengineering/ui'

  import notification from '../../plugin'
  import { providersSettings } from '../../utils'

  export let group: Ref<NotificationGroup>
  export let settings: Map<Ref<BaseNotificationType>, NotificationTypeSetting[]>

  const providers: NotificationProvider[] = getClient()
    .getModel()
    .findAllSync(notification.class.NotificationProvider, {})
    .sort((provider1, provider2) => provider1.order - provider2.order)
  const providerDefaults: NotificationProviderDefaults[] = getClient()
    .getModel()
    .findAllSync(notification.class.NotificationProviderDefaults, {})
  const providersMap: IdMap<NotificationProvider> = toIdMap(providers)

  $: types = getClient().getModel().findAllSync(notification.class.BaseNotificationType, { group })
  $: typesMap = toIdMap(types)

  function getStatus (
    settings: Map<Ref<BaseNotificationType>, NotificationTypeSetting[]>,
    type: Ref<BaseNotificationType>,
    provider: Ref<NotificationProvider>
  ): boolean {
    const setting = getTypeSetting(settings, type, provider)
    if (setting !== undefined) return setting.enabled
    const prov = providersMap.get(provider)
    if (prov === undefined) return false
    const providerEnabled = providerDefaults.some((it) => it.provider === provider && it.enabledTypes.includes(type))
    if (providerEnabled) return true
    const typeValue = typesMap.get(type)
    if (typeValue === undefined) return false
    return typeValue.defaultEnabled
  }

  async function onToggle (
    typeId: Ref<BaseNotificationType>,
    providerId: Ref<NotificationProvider>,
    value: boolean
  ): Promise<void> {
    const provider = providersMap.get(providerId)
    if (provider === undefined) return
    const currentSetting = getTypeSetting(settings, typeId, providerId)
    if (currentSetting === undefined) {
      await client.createDoc(notification.class.NotificationTypeSetting, core.space.Workspace, {
        attachedTo: providerId,
        type: typeId,
        enabled: value
      })
    } else {
      await client.update(currentSetting, {
        enabled: value
      })
    }
    if (value && provider?.depends !== undefined) {
      const current = getStatus(settings, typeId, provider.depends)
      if (!current) {
        await onToggle(typeId, provider.depends, true)
      }
    } else if (!value) {
      const dependents = providers.filter(({ depends }) => depends === providerId)
      for (const dependent of dependents) {
        await onToggle(typeId, dependent._id, false)
      }
    }
  }

  function getTypeSetting (
    map: Map<Ref<BaseNotificationType>, NotificationTypeSetting[]>,
    type: Ref<BaseNotificationType>,
    provider: Ref<NotificationProvider>
  ): NotificationTypeSetting | undefined {
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

  function isIgnored (type: Ref<BaseNotificationType>, provider: NotificationProvider): boolean {
    const ignored = providerDefaults.some((it) => provider._id === it.provider && it.ignoredTypes.includes(type))

    if (ignored) return true

    if (provider.ignoreAll === true) {
      return !providerDefaults.some(
        (it) => provider._id === it.provider && it.excludeIgnore !== undefined && it.excludeIgnore.includes(type)
      )
    }

    return false
  }

  async function getFilteredProviders (
    providers: NotificationProvider[],
    types: BaseNotificationType[],
    providersSettings: NotificationProviderSetting[]
  ): Promise<NotificationProvider[]> {
    const result: NotificationProvider[] = []

    for (const provider of providers) {
      const providerSetting = providersSettings.find((p) => p.attachedTo === provider._id)

      if (providerSetting !== undefined && !providerSetting.enabled) continue
      if (providerSetting === undefined && !provider.defaultEnabled) continue

      if (provider.isAvailableFn !== undefined) {
        const isAvailableFn = await getResource(provider.isAvailableFn)
        if (!isAvailableFn()) continue
      }

      if (provider.ignoreAll === true) {
        const ignoreExcluded = providerDefaults
          .map((it) => (provider._id === it.provider && it.excludeIgnore !== undefined ? it.excludeIgnore : []))
          .flat()

        const included = types.some((type) => ignoreExcluded.includes(type._id))
        if (!included) continue
      }

      result.push(provider)
    }

    return result
  }

  let filteredProviders: NotificationProvider[] = []

  $: void getFilteredProviders(providers, types, $providersSettings).then((result) => {
    filteredProviders = result
  })

  $: column = filteredProviders.length + 1
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
      {#each filteredProviders as provider (provider._id)}
        {#if !isIgnored(type._id, provider)}
          {@const status = getStatus(settings, type._id, provider._id)}
          <div class="toggle">
            <ModernToggle
              size="small"
              label={provider.label}
              checked={status}
              on:change={() => onToggle(type._id, provider._id, !status)}
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
