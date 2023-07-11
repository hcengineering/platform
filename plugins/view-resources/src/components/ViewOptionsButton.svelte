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
  import { Button, ButtonKind, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { focusStore } from '../selection'
  import { setViewOptions } from '../viewOptions'
  import ViewOptionsEditor from './ViewOptions.svelte'

  export let viewlet: Viewlet | undefined
  export let kind: ButtonKind = 'regular'
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()

  let btn: HTMLButtonElement

  function clickHandler (event: MouseEvent) {
    showPopup(
      ViewOptionsEditor,
      { viewlet, config: viewlet?.viewOptions, viewOptions },
      eventToHTMLElement(event),
      undefined,
      (result) => {
        if (result?.key === undefined) return
        if (viewlet) {
          viewOptions = { ...viewOptions, [result.key]: result.value }

          // Clear selection on view settings change.
          focusStore.set({})

          dispatch('viewOptions', viewOptions)
          setViewOptions(viewlet, viewOptions)
        }
      }
    )
  }
</script>

{#if viewlet?.viewOptions !== undefined}
  <Button
    icon={view.icon.ViewButton}
    label={view.string.View}
    {kind}
    adaptiveShrink={'sm'}
    showTooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
    bind:input={btn}
    on:click={clickHandler}
  />
{/if}
