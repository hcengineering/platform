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
  import { getPlatformColor, themeStore } from '@hcengineering/ui'

  export let value: boolean
  export let trueColor = 16
  export let falseColor = 0
  export let useInvert = false

  $: val = useInvert ? !value : value
  $: color = val ? getPlatformColor(trueColor, $themeStore.dark) : getPlatformColor(falseColor, $themeStore.dark)
</script>

{#if val}
  <div class="flex-center">
    <div class="pinned-container" style="background-color: {color};" />
  </div>
{/if}

<style lang="scss">
  .pinned-container {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 0.5rem;
  }
</style>
