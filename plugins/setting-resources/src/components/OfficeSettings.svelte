<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import core, { Configuration } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Header, Label, Scroller, Toggle } from '@hcengineering/ui'
  import settingsRes from '../plugin'

  let loading = true
  let defaultStartWithTranscription = false
  let defaultStartWithRecording = false

  const client = getClient()
  let officeSettingsConfiguration: Configuration | undefined = undefined

  const configurationQuery = createQuery()
  $: configurationQuery.query(
    core.class.Configuration,
    { _id: settingsRes.ids.OfficeSettingsConfiguration },
    (result) => {
      officeSettingsConfiguration = result[0]
      if (officeSettingsConfiguration !== undefined) {
        defaultStartWithTranscription = (officeSettingsConfiguration as any).defaultStartWithTranscription ?? false
        defaultStartWithRecording = (officeSettingsConfiguration as any).defaultStartWithRecording ?? false
      }
      loading = false
    }
  )

  async function toggleDefaultTranscription (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    defaultStartWithTranscription = enabled
    if (officeSettingsConfiguration === undefined) {
      await client.createDoc(
        core.class.Configuration,
        core.space.Workspace,
        {
          defaultStartWithTranscription: enabled,
          defaultStartWithRecording
        },
        settingsRes.ids.OfficeSettingsConfiguration
      )
    } else {
      await client.update(officeSettingsConfiguration, {
        defaultStartWithTranscription: enabled,
        defaultStartWithRecording
      } as any)
    }
  }

  async function toggleDefaultRecording (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    defaultStartWithRecording = enabled
    if (officeSettingsConfiguration === undefined) {
      await client.createDoc(
        core.class.Configuration,
        core.space.Workspace,
        {
          defaultStartWithTranscription,
          defaultStartWithRecording: enabled
        },
        settingsRes.ids.OfficeSettingsConfiguration
      )
    } else {
      await client.update(officeSettingsConfiguration, {
        defaultStartWithTranscription,
        defaultStartWithRecording: enabled
      } as any)
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Label label={settingsRes.string.OfficeSettings} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#if loading}
      <div class="w-full h-full flex-col-center justify-center">
        <!-- Loading... -->
      </div>
    {:else}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content flex-col flex-gap-4">
          <div class="title"><Label label={settingsRes.string.OfficeDefaultSettings} /></div>

          <div class="flex-col flex-gap-4 mt-6">
            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.DefaultStartWithTranscription} />
              <Toggle
                on={defaultStartWithTranscription}
                on:change={(e) => {
                  void toggleDefaultTranscription(e)
                }}
              />
            </div>

            <div class="flex-row-center flex-gap-4">
              <Label label={settingsRes.string.DefaultStartWithRecording} />
              <Toggle
                on={defaultStartWithRecording}
                on:change={(e) => {
                  void toggleDefaultRecording(e)
                }}
              />
            </div>
          </div>
        </div>
      </Scroller>
    {/if}
  </div>
</div>

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1rem;
  }
</style>
