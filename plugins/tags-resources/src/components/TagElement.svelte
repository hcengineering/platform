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
  import { TagElement } from '@hcengineering/tags'
  import { getPlatformColorDef, themeStore } from '@hcengineering/ui'

  export let element: TagElement

  $: color = getPlatformColorDef(element.color ?? 0, $themeStore.dark)
</script>

<div class="color" style:background-color={color.color} />
<span class="label overflow-label ml-1-5 max-w-40">
  {element.title}
</span>

<style lang="scss">
  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
</style>
