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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { DocPopup } from '@hcengineering/presentation'
  import { BaseDocPresenter } from '@hcengineering/view-resources'

  import { getChannelIcon } from '../../../utils'

  export let _class: Ref<Class<Doc>>
  export let objects: Doc[] = []
  export let multiSelect: boolean = false
  export let closeAfterSelect: boolean = true
  export let allowDeselect: boolean = false
  export let selectedObjects: Ref<Doc>[] = []
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let size: 'small' | 'medium' | 'large' = 'large'
  export let groupBy = '_class'
</script>

<DocPopup
  {_class}
  {objects}
  {multiSelect}
  {closeAfterSelect}
  {allowDeselect}
  {selectedObjects}
  {width}
  {size}
  {groupBy}
  noSearchField
  on:update
  on:close
  on:changeContent
>
  <svelte:fragment slot="item" let:item>
    <BaseDocPresenter object={item} {size} icon={getChannelIcon(item)} />
  </svelte:fragment>
</DocPopup>
