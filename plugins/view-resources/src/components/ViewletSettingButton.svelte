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
  import { Button, ButtonKind, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import view from '../plugin'
  import { getViewOptions, viewOptionStore } from '../viewOptions'
  import ViewOptionsButton from './ViewOptionsButton.svelte'
  import ViewletSetting from './ViewletSetting.svelte'

  export let kind: ButtonKind = 'regular'
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined

  let btn: HTMLButtonElement

  function clickHandler (event: MouseEvent) {
    showPopup(ViewletSetting, { viewlet }, btn)
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
</script>

{#if viewlet}
  <div class="flex-row-center gap-2 reverse">
    {#if viewOptions}
      <ViewOptionsButton {viewlet} {kind} {viewOptions} />
    {/if}
    <Button
      icon={view.icon.Configure}
      label={view.string.Show}
      {kind}
      shrink={1}
      adaptiveShrink={'sm'}
      showTooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
      bind:input={btn}
      on:click={clickHandler}
    />
  </div>
{/if}
