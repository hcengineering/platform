<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'
  import { MeetingMinutes } from '@hcengineering/love'
  import { createEventDispatcher, onMount } from 'svelte'

  import love from '../plugin'

  export let object: MeetingMinutes
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()

  let currentTitle = object.title
  let newTitle = object.title

  $: if (object.title !== currentTitle) {
    newTitle = object.title
    currentTitle = object.title
  }

  async function changeTitle (): Promise<void> {
    await getClient().diffUpdate(object, { title: newTitle })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['title'] })
  })
</script>

<div class="flex-row-stretch">
  <div class="flex-col flex-grow">
    <div class="title">
      <EditBox
        disabled={readonly}
        placeholder={love.string.MeetingMinutes}
        bind:value={newTitle}
        on:change={changeTitle}
        focusIndex={1}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
</style>
