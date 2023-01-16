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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { KeyedAttribute } from '../attributes'
  import AttributeBarEditor from './AttributeBarEditor.svelte'

  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let keys: (string | KeyedAttribute)[]
  export let showHeader: boolean = true
  export let readonly = false
  export let draft = false
</script>

<div class="attributes-bar-container vertical">
  {#each keys as key (typeof key === 'string' ? key : key.key)}
    <AttributeBarEditor {key} {_class} {object} {showHeader} {readonly} {draft} on:update />
  {/each}
</div>

<style lang="scss">
  .attributes-bar-container {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-auto-flow: row;
    justify-content: flex-start;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    width: 100%;
    height: min-content;
  }
</style>
