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
  import documents, { DocumentCategory } from '@hcengineering/controlled-documents'
  import { Class, DocumentQuery, Ref, TypedSpace } from '@hcengineering/core'
  import { ActionContext } from '@hcengineering/presentation'
  import { Button, IconAdd, Loading, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { TableBrowser, ViewletPanelHeader } from '@hcengineering/view-resources'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'

  import document from '../plugin'
  import CreateDocumentCategory from './CreateDocumentCategory.svelte'

  export let query: DocumentQuery<DocumentCategory> = {}
  export let space: Ref<TypedSpace> = documents.space.QualityDocuments

  let resultQuery: DocumentQuery<DocumentCategory> = { ...query }

  let viewlet: Viewlet | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined = undefined
  let loading = true

  $: canCreate = checkMyPermission(documents.permission.CreateDocumentCategory, space, $permissionsStore)

  const _class: Ref<Class<DocumentCategory>> = document.class.DocumentCategory

  function showCreateDialog (): void {
    showPopup(CreateDocumentCategory, {}, 'top')
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<ViewletPanelHeader
  viewletQuery={{
    attachTo: _class,
    descriptor: view.viewlet.Table
  }}
  bind:viewlet
  bind:loading
  bind:viewOptions
  bind:preference
  {_class}
  title={document.string.Categories}
  icon={documents.icon.Library}
  {query}
  bind:resultQuery
  hideActions={!canCreate}
>
  <svelte:fragment slot="actions">
    {#if canCreate}
      <Button
        icon={IconAdd}
        label={document.string.DocumentCategoryCreateLabel}
        size="small"
        kind="primary"
        on:click={showCreateDialog}
      />
    {/if}
  </svelte:fragment>
</ViewletPanelHeader>

{#if loading}
  <Loading />
{:else if viewlet && viewOptions}
  <TableBrowser
    {_class}
    config={preference?.config ?? viewlet.config}
    options={viewlet.options}
    query={resultQuery}
    showNotification
  />
{/if}
