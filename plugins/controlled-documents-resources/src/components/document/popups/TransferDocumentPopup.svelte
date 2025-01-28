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
  import documents, {
    canTransferDocuments,
    DocumentMeta,
    DocumentTransferRequest,
    listDocumentsAffectedByTransfer,
    transferDocuments,
    type DocumentSpace,
    type DocumentSpaceType,
    type Project,
    type ProjectDocument
  } from '@hcengineering/controlled-documents'
  import { type Doc, type Ref, type Space } from '@hcengineering/core'
  import presentation, { getClient, SpaceSelector } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import { permissionsStore } from '@hcengineering/contact-resources'
  import { createEventDispatcher } from 'svelte'

  import documentsRes from '../../../plugin'
  import { getLatestProjectId } from '../../../utils'
  import DocumentParentSelector from '../../hierarchy/DocumentParentSelector.svelte'
  import ProjectSelector from '../../project/ProjectSelector.svelte'

  import Info from '../../icons/Info.svelte'

  export let sourceDocumentIds: Ref<DocumentMeta>[] = []
  export let sourceSpaceId: Ref<DocumentSpace> | undefined
  export let sourceProjectId: Ref<Project<DocumentSpace>> | undefined

  let targetSpaceId: Ref<DocumentSpace> | undefined
  let targetParentId: Ref<DocumentMeta> | undefined

  let targetSpace: DocumentSpace | undefined
  $: void fetchSpace(targetSpaceId)

  let targetSpaceType: DocumentSpaceType | undefined
  $: void fetchSpaceType(targetSpace?.type)

  let targetProjectId: Ref<Project> | undefined
  $: void selectProject(targetSpaceId)

  let targetParentDocumentId: Ref<ProjectDocument> | undefined

  let affectedDocs: DocumentMeta[] = []
  let canTransfer = false

  $: request =
    sourceSpaceId !== undefined && targetSpaceId !== undefined
      ? ({
          sourceDocumentIds,
          sourceSpaceId,
          sourceProjectId,
          targetSpaceId,
          targetProjectId,
          targetParentId
        } satisfies DocumentTransferRequest)
      : undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  async function transfer (): Promise<void> {
    if (request !== undefined) {
      await transferDocuments(client, request)
      dispatch('close')
    }
  }

  $: if (request !== undefined) {
    void listDocumentsAffectedByTransfer(client, request).then((result) => {
      affectedDocs = result
    })
  }

  $: if (request !== undefined) {
    void canTransferDocuments(client, request).then((value) => {
      canTransfer = value
    })
  } else {
    canTransfer = false
  }

  async function selectProject (spaceRef: Ref<DocumentSpace> | undefined): Promise<void> {
    targetProjectId = spaceRef !== undefined ? await getLatestProjectId(spaceRef) : undefined
  }

  async function fetchSpace (id: Ref<DocumentSpace> | undefined): Promise<void> {
    targetSpace = id === undefined ? undefined : await client.findOne(documents.class.DocumentSpace, { _id: id })
  }

  async function fetchSpaceType (id: Ref<DocumentSpaceType> | undefined): Promise<void> {
    targetSpaceType =
      id === undefined ? undefined : await client.findOne(documents.class.DocumentSpaceType, { _id: id }, {})
  }

  async function handleParentSelected (doc: Doc): Promise<void> {
    if (hierarchy.isDerived(doc._class, documents.class.DocumentSpace)) {
      targetParentDocumentId = undefined
      targetParentId = undefined
    } else if (hierarchy.isDerived(doc._class, documents.class.ProjectDocument)) {
      const pjDoc = doc as ProjectDocument
      targetParentDocumentId = pjDoc._id
      const pjMeta = await client.findOne(documents.class.ProjectMeta, { _id: pjDoc.attachedTo })
      if (targetParentDocumentId === pjDoc._id) targetParentId = pjMeta?.meta
    }
  }

  function handleProjectSelected (value: Ref<Project> | undefined): void {
    targetProjectId = value
  }

  let haveTemplateObjects: boolean = false
  $: void checkForTemplateObjects(affectedDocs)

  async function checkForTemplateObjects (docs: DocumentMeta[]): Promise<void> {
    const cdocs = await client.findAll(documents.class.ControlledDocument, {
      attachedTo: { $in: docs.map((d) => d._id) }
    })
    haveTemplateObjects = cdocs.some((doc) => hierarchy.hasMixin(doc, documents.mixin.DocumentTemplate))
  }

  const externalSpaces = hierarchy.getDescendants(documents.class.ExternalSpace)

  $: hasParentSelector = targetSpaceId !== documents.space.UnsortedTemplates
  $: permissionRestrictedSpaces = Object.entries($permissionsStore.ps)
    .filter(([, pss]) => !pss.has(documents.permission.CreateDocument))
    .map(([s]) => s) as Ref<Space>[]
  $: restrictedSpaces =
    sourceSpaceId !== undefined ? permissionRestrictedSpaces.concat(sourceSpaceId) : permissionRestrictedSpaces

  $: spaceQuery = haveTemplateObjects
    ? { _id: { $nin: restrictedSpaces }, archived: false, _class: { $nin: externalSpaces } }
    : { _id: { $nin: restrictedSpaces }, archived: false }
</script>

<div class="popup">
  <div class="bottom-divider">
    <div class="text-xl pr-6 pl-6 pt-4 pb-4 primary-text-color">
      <Label label={documents.string.TransferDocuments} />
    </div>
  </div>
  <div class="p-6 bottom-divider popup-body">
    <div class="sectionTitle"><Label label={documentsRes.string.Space} /></div>
    <div class="flex-row-center flex-no-shrink flex-gap-4">
      <div class="space">
        <SpaceSelector
          _class={documents.class.DocumentSpace}
          query={spaceQuery}
          bind:space={targetSpaceId}
          label={documentsRes.string.Space}
          width="100%"
          justify="left"
          autoSelect={true}
        />
      </div>
      {#if targetSpace && targetSpaceType && targetSpaceType.projects}
        <div class="space">
          <ProjectSelector
            value={targetProjectId}
            space={targetSpace._id}
            kind={'no-border'}
            size={'small'}
            justify="left"
            showReadonly={false}
            on:change={(e) => {
              handleProjectSelected(e.detail)
            }}
          />
        </div>
      {/if}
    </div>
    <div class="parentText pt-4"><Label label={documents.string.TransferDocumentsHint} /></div>
    <ol class="docList">
      {#each affectedDocs as object}
        <li>{object.title}</li>
      {/each}
    </ol>
    {#if hasParentSelector}
      <div class="sectionTitle"><Label label={documents.string.Parent} /></div>
      <div class="parentText"><Label label={documentsRes.string.SelectParent} /></div>
      <div class="parentSelector">
        {#if targetSpace}
          <DocumentParentSelector
            space={targetSpace}
            project={targetProjectId}
            selected={targetParentDocumentId}
            collapsedPrefix="locationStep"
            on:selected={(e) => {
              void handleParentSelected(e.detail)
            }}
          />
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center flex-between pr-6 pl-6 pt-4 pb-4">
    <div class="flex flex-gap-2 items-center max-w-120 p-1 text-xs pr-4">
      <div class="warning-sign">
        <Info size="small" />
      </div>
      <Label label={documents.string.TransferWarning} />
    </div>
    <div class="flex justify-end items-center flex-gap-2">
      <Button kind="regular" label={presentation.string.Cancel} on:click={() => dispatch('close')} />
      <Button
        kind={canTransfer ? 'primary' : 'ghost'}
        disabled={!canTransfer}
        label={documents.string.Transfer}
        on:click={transfer}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    width: 58.25rem;
    border-radius: 1.25rem;
    background-color: var(--theme-dialog-background-color);
  }

  .docList li {
    color: var(--global-primary-TextColor);
  }

  .popup-body {
    height: 60vh;
    overflow-y: auto;
  }

  .hint {
    color: var(--theme-dark-color);
  }

  .warning-sign {
    color: var(--theme-docs-warning-icon-color);
  }

  .primary-text-color {
    color: var(--theme-text-primary-color);
  }

  .sectionTitle {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;

    &:not(:first-child) {
      margin-top: 1.5rem;
    }
  }

  .space {
    width: 12.5rem;
    margin-top: 0.5rem;
  }

  .parentText {
    font-size: 0.6875rem;
    line-height: 1rem;
  }

  .parentSelector {
    margin-top: 0.5rem;
  }
</style>
