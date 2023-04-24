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
  import { SortingOrder, WithLookup } from '@hcengineering/core'
  import { Scrum } from '@hcengineering/tracker'
  import {
    Button,
    Icon,
    deviceOptionsStore as deviceInfo,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import Expanded from '../icons/Expanded.svelte'
  import ScrumPopup from './ScrumPopup.svelte'

  export let scrum: WithLookup<Scrum>

  let container: HTMLElement

  $: twoRows = $deviceInfo.twoRows

  const handleSelectScrum = (evt: MouseEvent): void => {
    showPopup(
      ScrumPopup,
      {
        _class: tracker.class.Scrum,
        query: { space: scrum.space },
        options: { sort: { beginTime: SortingOrder.Ascending } }
      },
      container,
      (value) => {
        if (value != null) {
          const loc = getCurrentResolvedLocation()
          loc.path[5] = value._id
          navigate(loc)
        }
      }
    )
  }
</script>

<div class="ac-header withSettings" class:full={!twoRows} class:mini={twoRows}>
  <div class:ac-header-full={!twoRows} class:flex-between={twoRows}>
    <div bind:this={container} class="ac-header__wrap-title mr-3">
      <Button size={'small'} kind={'link'} on:click={handleSelectScrum}>
        <svelte:fragment slot="content">
          <div class="ac-header__icon">
            <Icon icon={tracker.icon.Scrum} size={'small'} />
          </div>
          <span class="ac-header__title mr-1">{scrum.title}</span>
          <Icon icon={Expanded} size={'small'} />
        </svelte:fragment>
      </Button>
    </div>
  </div>
  <slot name="options" />
</div>
