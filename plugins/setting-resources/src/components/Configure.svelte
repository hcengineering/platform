<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { PluginConfiguration, systemAccountUuid } from '@hcengineering/core'
  import {
    createQuery,
    getClient,
    pluginConfigurationStore,
    hasResource,
    isDisabled,
    PluginConfigurationCard
  } from '@hcengineering/presentation'
  import ratingPlugin, { getRaiting, type PersonRating } from '@hcengineering/rating'
  import { Breadcrumb, Header, Label, Scroller } from '@hcengineering/ui'
  import setting from '../plugin'

  const client = getClient()

  async function change (config: PluginConfiguration, value: boolean): Promise<void> {
    await client.update(config, {
      enabled: value
    })
  }

  const sysQuery = createQuery()
  let sysRating: PersonRating | undefined

  sysQuery.query(ratingPlugin.class.PersonRating, { accountId: systemAccountUuid }, (res) => {
    sysRating = res[0]
  })

  $: totalVisible = getRaiting(
    100,
    sysRating,
    $pluginConfigurationStore.list.filter((it) => it.enabled && it.hidden !== true && it.system !== true)
  )
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Setting} label={setting.string.Configuration} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <div class="flex-row-center flex-wrap m-4 px-4">
      <Label label={setting.string.BetaWarning} />
    </div>
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="modules-grid">
        {#each $pluginConfigurationStore.list as config}
          {#if config.hidden !== true && config.system !== true && !isDisabled(config.pluginId)}
            {@const pluginRating = getRaiting(totalVisible, sysRating, [config])}
            {@const ratingSuffix = hasResource(ratingPlugin.component.RatingRing) ? `${pluginRating}%` : undefined}
            <PluginConfigurationCard
              label={config.label}
              description={config.description}
              icon={config.icon}
              enabled={config.enabled ?? true}
              beta={config.beta}
              suffix={ratingSuffix}
              on:toggle={(e) => change(config, e.detail.enabled)}
            />
          {/if}
        {/each}
      </div>
    </Scroller>
  </div>
</div>

<style lang="scss">
  .modules-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;

    @media (min-width: 40rem) {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
