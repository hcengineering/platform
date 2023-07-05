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
  import { Button, Icon, IconInfo, Label, Scroller } from '@hcengineering/ui'
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
  <Scroller>
    <div class="flex-row-center flex-wrap p-1 gap-around-4">
      {#each $configurationStore.list as config}
        {#if config.label}
          <div class="cardBox flex-col clear-mins" class:enabled={config.enabled ?? true}>
            <div class="flex-row-center">
              <span class="mr-2">
                <Icon icon={config.icon ?? IconInfo} size={'medium'} />
              </span>
              <span class="fs-title">
                <Label label={config.label} />
              </span>
            </div>
            {#if config.description}
              <div class="my-3 flex-grow clear-mins">
                <Label label={config.description} />
              </div>
            {/if}
            <div class="flex-between flex-row-center">
              {#if config.beta}
                <Label label={setting.string.ConfigBeta} />
              {/if}
              <div class="flex-row-center flex-reverse flex-grow max-h-9">
                <Button
                  label={config.enabled ?? true ? setting.string.ConfigDisable : setting.string.ConfigEnable}
                  size={'large'}
                  on:click={() => change(config, !(config.enabled ?? true))}
                />
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </Scroller>
</div>

<style lang="scss">
  .cardBox {
    flex-shrink: 0;
    padding: 1rem;
    width: 24rem;
    height: 10rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    &.enabled {
      background-color: var(--theme-button-pressed);
    }
  }
</style>
