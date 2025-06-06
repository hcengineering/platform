<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import documents, { DocumentCategory, DocumentTemplate } from '@hcengineering/controlled-documents'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'

  import { Ref } from '@hcengineering/core'
  import { DropdownLabelsPopup } from '@hcengineering/ui'

  export let object: DocumentTemplate

  const client = getClient()
  const dispatch = createEventDispatcher()

  let categories: DocumentCategory[] = []

  const query = createQuery()
  query.query(documents.class.DocumentCategory, {}, (res) => {
    categories = res
  })

  async function handleSubmit (category: Ref<DocumentCategory>): Promise<void> {
    await client.update(object, { category })
    dispatch('close')
  }
</script>

{#if object}
  <DropdownLabelsPopup
    items={categories.map((cat) => ({ id: cat._id, label: cat.title }))}
    selected={object.category}
    on:close={(e) => handleSubmit(e.detail)}
  />
{/if}
