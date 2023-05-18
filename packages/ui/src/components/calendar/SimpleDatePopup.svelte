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
  import { createEventDispatcher } from 'svelte'
  import Month from './Month.svelte'

  export let currentDate: Date | null
  export let mondayStart: boolean = true

  const dispatch = createEventDispatcher()
</script>

<div class="antiPopup popup">
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
  .popup {
    border-radius: 0.5rem;
  }
</style>
