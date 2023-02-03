<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Button, deviceOptionsStore as deviceInfo, Icon, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import Expanded from '../icons/Expanded.svelte'
  import { WithLookup } from '@hcengineering/core'
  import { ScrumRecord } from '@hcengineering/tracker'
  import ScrumRecordPopup from './ScrumRecordPopup.svelte'
  import ScrumRecordTitlePresenter from './ScrumRecordTitlePresenter.svelte'

  export let scrumRecord: WithLookup<ScrumRecord>

  let container: HTMLElement

  const dispatch = createEventDispatcher()

  $: twoRows = $deviceInfo.twoRows

  const handleSelectScrumRecord = (evt: MouseEvent): void => {
    showPopup(ScrumRecordPopup, { query: { attachedTo: scrumRecord.attachedTo } }, container, (value) => {
      if (value != null) {
        scrumRecord = value
        dispatch('scrumRecord', scrumRecord._id)
      }
    })
  }
</script>

<div class="ac-header withSettings" class:full={!twoRows} class:mini={twoRows}>
  <div class:ac-header-full={!twoRows} class:flex-between={twoRows}>
    <div bind:this={container} class="ac-header__wrap-title mr-3">
      <Button size={'small'} kind={'link'} on:click={handleSelectScrumRecord}>
        <svelte:fragment slot="content">
          <ScrumRecordTitlePresenter value={scrumRecord} />
          <Icon icon={Expanded} size={'small'} />
        </svelte:fragment>
      </Button>
    </div>
  </div>
  <slot name="options" />
</div>
