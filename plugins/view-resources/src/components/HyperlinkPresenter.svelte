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
  import { ScrollerBar } from '@hcengineering/ui'

  export let value: string
  export let inline: boolean = false
  let divScroll: HTMLElement
  $: _value = value ?? ''
</script>

{#if inline}
  <a href={value} target="_blank" rel="noreferrer" class="select-text">{_value}</a>
{:else}
  <div class="clear-mins max-w-80">
    <ScrollerBar bind:scroller={divScroll}>
      <a href={value} target="_blank" rel="noreferrer" class="select-text">{_value}</a>
    </ScrollerBar>
  </div>
{/if}
