<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import { Action } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import ui from '../plugin'

  export let actions: Action[] = []
  export let ctx: any = undefined

  const dispatch = createEventDispatcher()
  afterUpdate(() => {
    dispatch('update', Date.now())
  })
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#if actions.length === 0}
      <div class='p-6 error-color'>
        <Label label={ui.string.NoActionsDefined}/>
      </div>
      {/if}
      {#each actions as action}
        <div
          class="ap-menuItem flex-row-center"
          on:click={(evt) => {
            dispatch('close')
            action.action(evt, ctx)
          }}
        >
          {#if action.icon}
            <Icon icon={action.icon} size={'small'} />
          {/if}
          <div class="ml-3 pr-1"><Label label={action.label} /></div>
        </div>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
