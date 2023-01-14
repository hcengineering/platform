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
  import { Button, eventToHTMLElement, IconDownOutline, Label, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewOptionsModel } from '@hcengineering/view'
  import view from '../plugin'
  import { defaulOptions, getViewOptions, setViewOptions, viewOptionsStore } from '../viewOptions'
  import ViewletSetting from './ViewletSetting.svelte'
  import ViewOptions from './ViewOptions.svelte'

  export let viewlet: Viewlet | undefined

  let btn: HTMLButtonElement

  $: viewlet && loadViewOptionsStore(viewlet.viewOptions, viewlet._id)

  function loadViewOptionsStore (config: ViewOptionsModel | undefined, key: string) {
    if (!config) return
    viewOptionsStore.set(getViewOptions(key) ?? defaulOptions)
  }

  function clickHandler (event: MouseEvent) {
    if (viewlet?.viewOptions !== undefined) {
      showPopup(
        ViewOptions,
        { viewlet, config: viewlet.viewOptions, viewOptions: $viewOptionsStore },
        eventToHTMLElement(event),
        undefined,
        (result) => {
          if (result?.key === undefined) return
          $viewOptionsStore[result.key] = result.value
          viewOptionsStore.set($viewOptionsStore)
          setViewOptions(viewlet?._id ?? '', $viewOptionsStore)
        }
      )
    } else {
      showPopup(ViewletSetting, { viewlet }, btn)
    }
  }
</script>

{#if viewlet}
  <Button
    icon={view.icon.ViewButton}
    kind={'secondary'}
    size={'small'}
    showTooltip={{ label: view.string.CustomizeView }}
    bind:input={btn}
    on:click={clickHandler}
  >
    <svelte:fragment slot="content">
      <div class="flex-row-center clear-mins pointer-events-none">
        <span class="text-sm font-medium"><Label label={view.string.View} /></span>
        <div class="icon"><IconDownOutline size={'full'} /></div>
      </div>
    </svelte:fragment>
  </Button>
{/if}

<style lang="scss">
  .icon {
    margin-left: 0.25rem;
    width: 0.875rem;
    height: 0.875rem;
    color: var(--content-color);
  }
</style>
