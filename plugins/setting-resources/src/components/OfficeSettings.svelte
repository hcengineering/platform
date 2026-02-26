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
  import core from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { type OfficeSettings } from '@hcengineering/setting'
  import { Breadcrumb, Header, Label, Scroller, Toggle } from '@hcengineering/ui'
  import settingsRes from '../plugin'

  let loading = true
  let defaultStartWithTranscription = false
  let defaultStartWithRecording = false

  const client = getClient()
  let existingOfficeSettings: OfficeSettings[] = []
  const query = createQuery()

  $: query.query(setting.class.OfficeSettings, {}, (set) => {
    existingOfficeSettings = set as OfficeSettings[]
    if (existingOfficeSettings !== undefined && existingOfficeSettings.length > 0) {
      defaultStartWithTranscription = existingOfficeSettings[0].defaultStartWithTranscription ?? false
      defaultStartWithRecording = existingOfficeSettings[0].defaultStartWithRecording ?? false
    }
    loading = false
  })

  async function toggleDefaultTranscription (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    defaultStartWithTranscription = enabled
    const newSettings = {
      defaultStartWithTranscription: enabled,
      defaultStartWithRecording,
      enabled: true
    }
    if (existingOfficeSettings.length === 0) {
      await client.createDoc(setting.class.OfficeSettings, core.space.Workspace, newSettings)
    } else {
      await client.updateDoc(
        setting.class.OfficeSettings,
        core.space.Workspace,
        existingOfficeSettings[0]._id,
        newSettings
      )
    }
  }

  async function toggleDefaultRecording (e: CustomEvent<boolean>): Promise<void> {
    const enabled = e.detail
    defaultStartWithRecording = enabled
    const newSettings = {
      defaultStartWithTranscription,
      defaultStartWithRecording: enabled,
      enabled: true
    }
    if (existingOfficeSettings.length === 0) {
      await client.createDoc(setting.class.OfficeSettings, core.space.Workspace, newSettings)
    } else {
      await client.updateDoc(
        setting.class.OfficeSettings,
        core.space.Workspace,
        existingOfficeSettings[0]._id,
        newSettings
      )
    }
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb label={settingsRes.string.OfficeSettings} size={'large'} isCurrent />
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
