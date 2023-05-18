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
  import { createEventDispatcher } from 'svelte'
  import Label from '../Label.svelte'

  export let langs: any

  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup">
  <div class="ap-space x2" />
  {#each langs as lang}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="ap-menuItem hoverable flex-row-center"
      on:click={() => {
        dispatch('close', lang.id)
      }}
    >
      <svg class="svg-small">
        <use href="#{lang.id}-flag" />
      </svg>
      <div class="ml-2"><Label label={lang.label} /></div>
    </div>
  {/each}
  <div class="ap-space x2" />
</div>
