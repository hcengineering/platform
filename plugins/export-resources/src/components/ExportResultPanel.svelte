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
  import core, { type Class, type Doc, type Ref } from '@hcengineering/core'
  import exportPlugin, { type ExportResultRecord } from '@hcengineering/export'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, IconMoreH, Label } from '@hcengineering/ui'
  import view, { DocNavLink, ObjectPresenter, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'

  export let _id: Ref<ExportResultRecord>
  export let _class: Ref<Class<ExportResultRecord>>
  export let embedded: boolean = false

  const query = createQuery()
  const docsQuery = createQuery()
  const inboxClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())
  const dispatch = createEventDispatcher()

  let object: ExportResultRecord | undefined = undefined
  let lastId: Ref<Doc> | undefined = undefined
  let exportedDocs: Doc[] = []

  $: query.query(_class, { _id }, (result) => {
    object = result[0]
  })

  $: docClass = object?.objectClass ?? core.class.Doc
  $: hasExportedDocs = (object?.exportedDocumentIds?.length ?? 0) > 0
  $: if (hasExportedDocs && object != null) {
    docsQuery.query(docClass, { _id: { $in: object.exportedDocumentIds } }, (result) => {
      exportedDocs = result
    })
  } else {
    docsQuery.unsubscribe()
    exportedDocs = []
  }

  $: if (object?._id !== lastId) {
    const prev = lastId
    lastId = object?._id
    if (prev !== undefined) {
      void inboxClient.then((c) => {
        void c.readDoc(prev)
      })
    }
  }

  onDestroy(() => {
    void inboxClient.then((c) => {
      if (_id !== undefined) void c.readDoc(_id)
    })
  })
</script>

{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={true}
    {embedded}
    {object}
    on:open
    on:close={() => dispatch('close')}
    withoutInput
    withoutActivity
  >
    <svelte:fragment slot="title">
      <DocNavLink noUnderline {object}>
        <div class="title">
          {object.title ??
            `Import completed – ${object.exportedCount} document${object.exportedCount !== 1 ? 's' : ''}`}
        </div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        dataId="btnMoreActions"
        on:click={(e) => {
          showMenu(e, { object, excludedActions: [view.action.Open] })
        }}
      />
    </svelte:fragment>

    <div class="export-result-content flex-col flex-grow flex-no-shrink step-tb-6">
      <p class="export-result-summary">
        <Label
          label={exportPlugin.string.DocumentsImportedFromWorkspace}
          params={{ count: object.exportedCount, workspace: object.sourceWorkspace }}
        />
      </p>
      {#if exportedDocs.length > 0}
        <div class="doc-links">
          {#each exportedDocs as doc (doc._id)}
            <DocNavLink noUnderline object={doc}>
              <ObjectPresenter
                _class={docClass}
                value={doc}
                props={{ inline: true, size: 'small', withIcon: true, isGray: true }}
              />
            </DocNavLink>
          {/each}
        </div>
      {/if}
    </div>
  </Panel>
{/if}

<style lang="scss">
  .export-result-content {
    padding: 0 1rem;
  }
  .export-result-summary {
    margin: 0 0 0.75rem;
  }
  .doc-links {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    gap: 0.25rem 1rem;
  }
</style>
