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
  import type { Class, Doc, Ref } from '@anticrm/core'
  import { KeyedAttribute } from '../attributes'
  import AttributeBarEditor from './AttributeBarEditor.svelte'

  export let object: Doc
  export let _class: Ref<Class<Doc>>
  export let keys: (string | KeyedAttribute)[]
  export let showHeader: boolean = true
  export let vertical: boolean = false
</script>

<div class="attributes-bar-container {vertical ? 'vertical' : 'horizontal'}">
  {#each keys as key (typeof key === 'string' ? key : key.key)}
    {#if !vertical}
      <div class="flex-center column">
        <AttributeBarEditor {key} {_class} {object} {showHeader} />
      </div>
    {:else}
      <AttributeBarEditor {key} {_class} {object} {showHeader} vertical />
    {/if}
  {/each}
</div>

<style lang="scss">
  .column + .column {
    position: relative;
    &::before {
      content: '';
      position: absolute;
      background-color: var(--board-card-bg-hover);
    }
  }

  .attributes-bar-container {
    height: 100%;

    &.horizontal {
      display: flex;
      flex-direction: row;
      align-items: center;
      min-width: 0;
      font-size: 0.75rem;

      .column + .column {
        margin-left: 3rem;
        &::before {
          top: 0;
          bottom: 0;
          left: -1.5rem;
          width: 1px;
        }
      }
    }
    &.vertical {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      grid-auto-flow: row;
      justify-content: start;
      align-items: center;
      gap: 1rem;
      width: 100%;
      height: min-content;

      .column + .column {
        margin-top: 1rem;
        &::before {
          top: -0.5rem;
          left: 0;
          right: 0;
          height: 1px;
        }
      }
    }
  }
</style>
