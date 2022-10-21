<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Attachments } from '@hcengineering/attachment-resources'
  import core, { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import { Document, DocumentVersion } from '@hcengineering/document'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'

  import {
    Button,
    EditBox,
    eventToHTMLElement,
    Grid,
    IconAdd,
    IconEdit,
    IconMoreH,
    Label,
    SelectPopup,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu, UpDownNavigator } from '@hcengineering/view-resources'
  import ClassAttributeBar from '@hcengineering/view-resources/src/components/ClassAttributeBar.svelte'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import document from '../plugin'
  import CreateDocumentVersion from './CreateDocumentVersion.svelte'
  import DocumentEditor from './DocumentEditor.svelte'
  import DocumentViewer from './DocumentViewer.svelte'

  // import ControlPanel from './ControlPanel.svelte'
  // import CopyToClipboard from './CopyToClipboard.svelte'

  export let _id: Ref<Document>
  export let _class: Ref<Class<Document>>

  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class

  const query = createQuery()

  const dispatch = createEventDispatcher()
  const client = getClient()

  let documentObject: WithLookup<Document> | undefined

  let name = ''

  let innerWidth: number
  let isEditing = false

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      const prevClass = lastClass
      lastId = _id
      lastClass = _class
      notificationClient.then((client) => client.updateLastView(prev, prevClass))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.updateLastView(_id, _class))
  })

  $: _id &&
    _class &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[documentObject] = result
        name = documentObject.name
      },
      {}
    )

  $: canSave = name.trim().length > 0

  function edit (ev: MouseEvent) {
    ev.preventDefault()

    isEditing = true
  }

  let documentEditor: DocumentEditor

  function commitEditing (ev: MouseEvent) {
    ev.preventDefault()

    documentEditor.applySteps().then(() => {
      autoSelect = true
      isEditing = false
    })
  }

  async function save (ev: Event) {
    ev.preventDefault()

    if (!documentObject || !canSave) {
      return
    }

    const nameTrimmed = name.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== documentObject.name) {
      await client.update(documentObject, { name: nameTrimmed })
    }
  }

  function showMenu (ev?: Event): void {
    if (documentObject) {
      showPopup(ContextMenu, { object: documentObject }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })

  const versionQuery = createQuery()
  let versions: DocumentVersion[] = []

  $: versionQuery.query(
    document.class.DocumentVersion,
    { attachedTo: _id },
    (res) => {
      versions = res
    },
    { sort: { version: 1 } }
  )
  let version: DocumentVersion | undefined

  let info: any

  $: {
    const ifo: any = [
      ...versions.map((it) => ({
        id: it._id as string,
        text: `${it.version} - ${new Date(it.modifiedOn).toDateString()} `
      }))
    ]
    if (lastVersion === undefined || lastVersion.sequenceNumber !== documentObject?.editSequence) {
      ifo.push({
        id: '#latest',
        label: document.string.LastRevision
      })
    }
    info = ifo
  }
  function selectVersion (event: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: info,
        placeholder: document.string.Version,
        searchable: true
      },
      eventToHTMLElement(event),
      (res) => {
        if (res != null) {
          version = versions.find((it) => it._id === res)
        }
      }
    )
  }

  function createVersion (event: MouseEvent) {
    showPopup(CreateDocumentVersion, { object: documentObject }, 'top')
  }

  $: lastVersion = versions[versions.length - 1]

  let autoSelect = true
  $: if (autoSelect && version === undefined && lastVersion) {
    version = lastVersion
    autoSelect = false
  }
</script>

{#if documentObject !== undefined}
  <Panel
    object={documentObject}
    isHeader
    isAside={true}
    isSub={false}
    withoutActivity={isEditing}
    bind:innerWidth
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={documentObject} />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title flex-row-center">
        <EditBox
          bind:value={name}
          placeholder={document.string.DocumentNamePlaceholder}
          kind="large-style"
          on:blur={(evt) => save(evt)}
        />
        <div class="p-1">-</div>
        <Button disabled={isEditing || info.length === 1} kind={'link-bordered'} on:click={selectVersion}>
          <svelte:fragment slot="content">
            {#if version && !isEditing}
              <Label label={document.string.Version} /> {version.version}
            {:else}
              <Label label={document.string.Revision} /> {documentObject.editSequence}
            {/if}
          </svelte:fragment>
        </Button>

        {#if !isEditing}
          {#if documentObject && version && version.sequenceNumber !== documentObject.editSequence}
            (<Label label={document.string.Revision} /> {version.sequenceNumber} / {documentObject.editSequence})
          {:else if documentObject}
            (<Label label={document.string.Revision} /> {documentObject.editSequence})
          {/if}
        {/if}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      {#if isEditing}
        <Button disabled={!canSave} label={presentation.string.Save} on:click={commitEditing} />
      {:else}
        <Button icon={IconEdit} kind={'transparent'} size={'medium'} on:click={edit} />
      {/if}
      {#if lastVersion === undefined || lastVersion.sequenceNumber !== documentObject.editSequence}
        <Button
          icon={IconAdd}
          kind={'transparent'}
          size={'medium'}
          on:click={createVersion}
          showTooltip={{ label: document.string.CreateDocumentVersion }}
        />
      {/if}
      <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
    </svelte:fragment>

    {#if isEditing}
      <div class="popupPanel-body__main-content py-10 clear-mins content">
        <DocumentEditor object={documentObject} bind:this={documentEditor} />
      </div>
    {:else}
      <div class="description-preview select-text mt-2">
        <DocumentViewer object={documentObject} revision={version?.sequenceNumber ?? documentObject.editSequence} />
      </div>

      <div class="p-1 mt-6">
        <Attachments objectId={documentObject._id} space={documentObject.space} _class={documentObject._class} />
      </div>
    {/if}

    <svelte:fragment slot="custom-attributes">
      <ClassAttributeBar
        object={documentObject}
        _class={documentObject._class}
        to={core.class.Doc}
        ignoreKeys={['name']}
      />

      <div class="divider" />

      <Grid column={2} rowGap={1}>
        <span class="label">
          <Label label={document.string.LastRevision} />
        </span>
        <span>{documentObject?.editSequence}</span>

        <span class="label">
          <Label label={document.string.Versions} />
        </span>
        <span>{documentObject?.versions}</span>
      </Grid>
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1.125rem;
    color: var(--theme-caption-color);
  }

  .content {
    height: auto;
  }

  .description-preview {
    color: var(--theme-content-color);
    line-height: 150%;

    .placeholder {
      color: var(--theme-content-trans-color);
    }
  }
  .divider {
    margin-top: 1rem;
    margin-bottom: 1rem;
    grid-column: 1 / 3;
    height: 1px;
    background-color: var(--divider-color);
  }

  .tool {
    align-self: start;
    width: 20px;
    height: 20px;
    opacity: 0.3;
    cursor: pointer;
    &:hover {
      opacity: 1;
    }
  }
</style>
