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
  import { dpstore } from '../..'
  import Month from './Month.svelte'

  const dispatch = createEventDispatcher()

  const today: Date = new Date(Date.now())
  $: currentDate = $dpstore.currentDate ?? today
  const mondayStart: boolean = true
</script>

<div class="month-popup-container">
  <Month
    bind:currentDate
    {mondayStart}
    on:update={(result) => {
      if (result.detail !== undefined) {
        dispatch('close', result.detail)
      }
    }}
  />
</div>

<style lang="scss">
  .month-popup-container {
    background: var(--popup-bg-color);
    border-radius: 0.5rem;
    box-shadow: var(--popup-shadow);
  }
</style>
