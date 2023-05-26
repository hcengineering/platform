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
  import { getPlatformColor, Label, themeStore } from '@hcengineering/ui'
  import task from '../../plugin'
  export let value: boolean

  $: color = value ? getPlatformColor(2, $themeStore.dark) : getPlatformColor(16, $themeStore.dark)
  $: text = value ? task.string.DoneState : task.string.UndoneState
</script>

{#if value !== undefined}
  <div class="overflow-label state-container" style="background-color: {color};">
    <Label label={text} />
  </div>
{/if}

<style lang="scss">
  .state-container {
    padding: 0.25rem 0.5rem;
    width: 6.25rem;
    max-width: 6.25rem;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.5px;
    font-size: 0.625rem;
    color: #fff;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
  }
</style>
