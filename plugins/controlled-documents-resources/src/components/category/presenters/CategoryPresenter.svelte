<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { DocumentCategory } from '@hcengineering/controlled-documents'

  import { Ref, WithLookup } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'

  import documents from '../../../plugin'

  export let value: WithLookup<DocumentCategory> | Ref<DocumentCategory>
  export let inline = false
  export let disableClick = false

  let category: DocumentCategory | undefined

  $: if (typeof value === 'string') {
    void getClient()
      .findOne(documents.class.DocumentCategory, { _id: value })
      .then((res) => {
        category = res
      })
  } else {
    category = value
  }
</script>

{#if category}
  <DocNavLink object={category} disabled={disableClick} accent {inline}>
    <div
      class={!disableClick ? 'flex-presenter' : 'category-presenter'}
      class:inline-presenter={inline}
      use:tooltip={{ label: getEmbeddedLabel(category.title) }}
    >
      <div class="icon category-icon">
        <Icon icon={documents.icon.Document} size={'small'} />
      </div>
      <span class="label fs-bold whitespace-nowrap">{category.code}</span>
    </div>
  </DocNavLink>
{/if}

<style lang="scss">
  .category-presenter {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    min-width: 0;
    &:hover {
      color: var(--accent-color);
      text-decoration: none;
    }
  }
  .category-icon {
    margin-right: 0.5rem;
  }
</style>
