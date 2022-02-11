<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Lead } from '@anticrm/lead'
  import { closeTooltip, Icon, showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let value: Lead

  const dispatch = createEventDispatcher()

  function show () {
    dispatch('click')
    closeTooltip()
    showPanel(view.component.EditDoc, value._id, value._class, 'full')
  }
</script>

{#if value}
  <div class="sm-tool-icon" on:click={show}>
    <span class="icon"><Icon icon={lead.icon.Lead} size={'small'} /></span>{value.title}
  </div>
{/if}
