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
  import { Mixin, DocumentQuery, Ref } from '@hcengineering/core'
  import { DocumentSpace, type DocumentTemplate } from '@hcengineering/controlled-documents'
  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { Button, IconAdd, Loading, showPopup } from '@hcengineering/ui'
  import view, { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { TableBrowser, ViewletPanelHeader } from '@hcengineering/view-resources'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'

  import documents from '../plugin'

  export let query: DocumentQuery<DocumentTemplate> = {}

  let srcQuery: DocumentQuery<DocumentTemplate> = { ...query }
  let resultQuery: DocumentQuery<DocumentTemplate> = { ...query }

  let viewlet: Viewlet | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined = undefined
  let loading = true
  const _class: Ref<Mixin<DocumentTemplate>> = documents.mixin.DocumentTemplate

  let spaces: Ref<DocumentSpace>[] = []
  const spacesQuery = createQuery()
  $: spacesQuery.query(
    documents.class.DocumentSpace,
    {},
    (res) => {
      spaces = res.map((s) => s._id)
    },
    {
      projection: {
        _id: 1
      }
    }
  )

  $: srcQuery = { ...query, space: { $in: spaces } }
  $: canAddTemplate = checkMyPermission(
    documents.permission.CreateDocument,
    documents.space.QualityDocuments,
    $permissionsStore
  )

  function showCreateDialog (): void {
    showPopup(documents.component.QmsTemplateWizard, { _class: documents.class.ControlledDocument })
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="antiPanel-component">
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
    icon={documents.icon.Library}
    title={documents.string.DocumentTemplates}
    query={srcQuery}
    bind:resultQuery
    hideActions={!canAddTemplate}
  >
    <svelte:fragment slot="actions">
      {#if canAddTemplate}
        <Button
          icon={IconAdd}
          label={documents.string.DocumentTemplateCreateLabel}
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
      enableChecking={false}
    />
  {/if}
</div>
