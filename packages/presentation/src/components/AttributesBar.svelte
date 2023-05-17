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
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { KeyedAttribute } from '../attributes'
  import AttributeBarEditor from './AttributeBarEditor.svelte'

  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let keys: (string | KeyedAttribute)[]
  export let showHeader: boolean = true
  export let readonly = false
  export let draft = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = '100%'
  export let justify: 'left' | 'center' = 'left'
</script>

<div class="popupPanel-body__aside-grid inCollapsed">
  {#each keys as key (typeof key === 'string' ? key : key.key)}
    <AttributeBarEditor {key} {_class} {object} {showHeader} {readonly} {draft} on:update />
  {/each}
</div>
