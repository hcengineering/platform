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
  import type { Doc } from '@anticrm/core'
  import { KeyedAttribute } from '../attributes'
  import AttributeBarEditor from './AttributeBarEditor.svelte'

  export let object: Doc
  export let keys: (string|KeyedAttribute)[]
</script>

<div class="flex-row-center text-sm">
  {#each keys as key}
    <div class="column">
      <AttributeBarEditor {key} {object} />
    </div>
  {/each}
</div>

<style lang="scss">
  .column + .column {
    position: relative;
    margin-left: 3rem;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -1.5rem;
      width: 1px;
      background-color: var(--theme-bg-accent-hover);
    }
  }
</style>