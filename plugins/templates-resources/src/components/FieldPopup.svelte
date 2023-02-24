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
  import { DocumentQuery, FindOptions, IdMap, toIdMap } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { createQuery, ObjectPopup } from '@hcengineering/presentation'
  import { TemplateField, TemplateFieldCategory } from '@hcengineering/templates'
  import { Label } from '@hcengineering/ui'
  import templates from '../plugin'

  export let options: FindOptions<TemplateField> | undefined = undefined
  export let docQuery: DocumentQuery<TemplateField> | undefined = undefined

  export let placeholder: IntlString = presentation.string.Search
  export let shadows: boolean = true

  const query = createQuery()

  let categories: IdMap<TemplateFieldCategory> = new Map()

  query.query(templates.class.TemplateFieldCategory, {}, (res) => {
    categories = toIdMap(res)
  })
</script>

<ObjectPopup
  _class={templates.class.TemplateField}
  {options}
  closeAfterSelect
  {placeholder}
  searchField={'label'}
  {docQuery}
  groupBy={'category'}
  {shadows}
  on:update
  on:close
  on:changeContent
>
  <svelte:fragment slot="item" let:item={field}>
    <div class="flex flex-grow overflow-label">
      <Label label={field.label} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={field}>
    <div class="flex flex-grow overflow-label">
      <span class="fs-medium flex-center gap-2 mt-2 mb-2 ml-2">
        <Label label={categories.get(field.category)?.label ?? field.label} />
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
