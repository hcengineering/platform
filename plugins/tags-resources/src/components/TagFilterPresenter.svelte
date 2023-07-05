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

  export let value: TagElement
</script>

<div class="container">
  <div class="color" style:background-color={getPlatformColorDef(value.color ?? 0, $themeStore.dark).color} />
  <span class="label overflow-label ml-1-5 max-w-40">
    {value.title}
  </span>
</div>

<style lang="scss">
  .container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 1.5rem;
    height: 1.5rem;
    padding: 0.25rem 0.625rem;
    user-select: none;

    .label {
      color: var(--theme-caption-color);
    }
  }

  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
</style>
