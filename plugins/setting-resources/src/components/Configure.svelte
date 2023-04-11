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
  import { PluginConfiguration } from '@hcengineering/core'
  import { configurationStore, getClient } from '@hcengineering/presentation'
  import { Button, Icon, IconInfo, Label } from '@hcengineering/ui'
  import setting from '../plugin'

  const client = getClient()

  async function change (config: PluginConfiguration, value: boolean): Promise<void> {
    await client.update(config, {
      enabled: value
    })
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Setting} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.Configuration} /></div>
  </div>
  <div class="flex flex-wrap p-3">
    {#each $configurationStore.list as config}
      {#if config.label}
        <div class="cardBox flex-col" class:enabled={config.enabled ?? true}>
          <div class="flex-row-center">
            <div class="p-1">
              <Icon icon={config.icon ?? IconInfo} size={'large'} />
            </div>
            <div class="fs-title">
              <Label label={config.label} />
            </div>
          </div>
          {#if config.description}
            <div class="p-3">
              <Label label={config.description} />
            </div>
          {/if}
          {#if config.configurable}
            <div class="flex-grow flex-reverse">
              <Button
                label={config.enabled ?? true ? setting.string.ConfigDisable : setting.string.ConfigEnable}
                size={'small'}
                kind={'link'}
                on:click={() => change(config, !(config.enabled ?? true))}
              />
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .cardBox {
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
    width: 24rem;
    height: 8rem;
    margin: 0.25rem;
    padding: 0.25rem;
    &.enabled {
      background-color: var(--button-bg-color);
    }
  }
</style>
