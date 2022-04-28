<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { Icon, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let selected: boolean = false

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="antiNav-element"
  class:selected
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  <div class="an-element__icon">
    {#if icon}
      <Icon {icon} size={'small'} />
    {/if}
  </div>
  <span class="an-element__label title">
    {#if label}<Label {label} />{:else}{label}{/if}
  </span>
</div>
