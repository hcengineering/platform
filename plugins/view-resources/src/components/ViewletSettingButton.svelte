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
  import { Button, ButtonKind, eventToHTMLElement, IconDownOutline, Label, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { setViewOptions } from '../viewOptions'
  import ViewletSetting from './ViewletSetting.svelte'
  import ViewOptionsEditor from './ViewOptions.svelte'

  export let viewlet: Viewlet | undefined
  export let kind: ButtonKind = 'secondary'
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()

  let btn: HTMLButtonElement

  function clickHandler (event: MouseEvent) {
    if (viewlet?.viewOptions !== undefined) {
      showPopup(
        ViewOptionsEditor,
        { viewlet, config: viewlet.viewOptions, viewOptions },
        eventToHTMLElement(event),
        undefined,
        (result) => {
          if (result?.key === undefined) return
          if (viewlet) {
            viewOptions = { ...viewOptions, [result.key]: result.value }
            dispatch('viewOptions', viewOptions)
            setViewOptions(viewlet, viewOptions)
          }
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
    {kind}
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
