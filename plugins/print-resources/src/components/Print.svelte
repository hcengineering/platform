<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import presentation, { ActionContext, getClient, getPrintContext } from '@hcengineering/presentation'
  import {
    Label,
    PanelInstance,
    Popup,
    TooltipInstance,
    defineSeparators,
    deviceOptionsStore as deviceInfo,
    setResolvedLocation,
    showPanel,
    type AnyComponent,
    type Location,
    type PopupAlignment
  } from '@hcengineering/ui'
  import { ListSelectionProvider, restrictionStore, updateFocus } from '@hcengineering/view-resources'
  import { tick } from 'svelte'
  import { readable } from 'svelte/store'

  export let target: Location

  const client = getClient()
  const printContext = getPrintContext()
  const pendingResources = printContext?.pendingResources ?? readable(0)
  const printError = printContext?.error ?? readable<Error | undefined>(undefined)
  let loadState: 'loading' | 'ready' | 'error' = 'loading'
  let contentPanel: HTMLElement

  $deviceInfo.navigator.visible = false
  defineSeparators('workbenchGuest', [null, { minSize: 20, size: 30, maxSize: 50, float: 'aside' }])

  async function load (): Promise<void> {
    try {
      restrictionStore.set({ readonly: true, disableNavigation: true, disableActions: true, disableComments: true })
      setResolvedLocation(target)
      if (target.fragment === undefined) throw new Error('Document target is missing')
      const props = decodeURIComponent(target.fragment).split('|')
      if (props.length < 3) throw new Error('Document target is invalid')
      const _id = props[1] as Ref<Doc>
      const _class = props[2] as Ref<Class<Doc>>
      const doc = await client.findOne(_class, { _id })
      if (doc === undefined) throw new Error('Document is not accessible')
      const provider = ListSelectionProvider.Find(doc._id)
      updateFocus({ provider, focus: doc })
      showPanel(props[0] as AnyComponent, _id, _class, props[3] as PopupAlignment, props[4] as AnyComponent, false)
      await tick()
      loadState = 'ready'
    } catch (error) {
      loadState = 'error'
      throw error
    }
  }
</script>

<div
  class="w-full h-full"
  data-print-root
  data-print-state={$printError !== undefined
    ? 'error'
    : loadState === 'ready' && $pendingResources > 0
      ? 'loading'
      : loadState}
>
  {#await load() then}
    <div class="workbench-container">
      <div class="workbench-container inner">
        <div class="antiPanel-component antiComponent" bind:this={contentPanel} />
      </div>
    </div>
    <div class="cover" />
    <TooltipInstance />
    <PanelInstance {contentPanel} readonly embedded>
      <svelte:fragment slot="panel-header">
        <ActionContext context={{ mode: 'panel' }} />
      </svelte:fragment>
    </PanelInstance>
    <Popup {contentPanel}>
      <svelte:fragment slot="popup-header">
        <ActionContext context={{ mode: 'popup' }} />
      </svelte:fragment>
    </Popup>
  {:catch}
    <Label label={presentation.string.AccessDenied} />
  {/await}
</div>

<style lang="scss">
  .workbench-container {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  @media print {
    .workbench-container:has(~ .panel-instance) {
      display: none;
    }
  }
</style>
