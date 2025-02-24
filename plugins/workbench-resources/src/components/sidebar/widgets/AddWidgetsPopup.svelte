<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Widget, WidgetPreference, WidgetType } from '@hcengineering/workbench'
  import { CheckBox, Grid, Modal } from '@hcengineering/ui'
  import core, { Ref } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'

  import WidgetPresenter from './WidgetPresenter.svelte'
  import workbench from '../../../plugin'

  export let widgets: Widget[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()
  const preferencesQuery = createQuery()

  const widgetsUpdates = new Map<Ref<Widget>, boolean>()

  let preferences: WidgetPreference[] = []
  $: preferencesQuery.query(workbench.class.WidgetPreference, {}, (res) => {
    preferences = res
  })

  function handleClose (): void {
    dispatch('close')
  }

  function isEnabled (
    widget: Widget,
    widgetsUpdates: Map<Ref<Widget>, boolean>,
    preference?: WidgetPreference
  ): boolean {
    return widgetsUpdates.get(widget._id) ?? preference?.enabled ?? false
  }

  function handleCheck (widget: Widget, preference?: WidgetPreference): void {
    const newValue = !isEnabled(widget, widgetsUpdates, preference)

    widgetsUpdates.set(widget._id, newValue)
  }

  async function handleApply (): Promise<void> {
    for (const [widget, enabled] of widgetsUpdates) {
      const preference = preferences.find((it) => it.attachedTo === widget)
      if (preference !== undefined) {
        await client.diffUpdate(preference, { enabled })
      } else {
        await client.createDoc(workbench.class.WidgetPreference, core.space.Workspace, { attachedTo: widget, enabled })
      }
    }

    dispatch('close')
  }
</script>

<Modal
  label={workbench.string.ConfigureWidgets}
  type="type-popup"
  okLabel={presentation.string.Save}
  okAction={handleApply}
  canSave={true}
  onCancel={handleClose}
  on:close
>
  <Grid column={1} rowGap={0.5}>
    {#each widgets as widget}
      {#if widget.type === WidgetType.Configurable}
        {@const preference = preferences.find((it) => it.attachedTo === widget._id)}
        <div class="item">
          <CheckBox
            size="small"
            checked={isEnabled(widget, widgetsUpdates, preference)}
            on:value={() => {
              handleCheck(widget, preference)
            }}
          />
          <WidgetPresenter {widget} withLabel />
        </div>
      {/if}
    {/each}
  </Grid>
</Modal>

<style lang="scss">
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
