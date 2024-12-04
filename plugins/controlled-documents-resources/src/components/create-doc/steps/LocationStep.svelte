<!--
// Copyright © 2023-2024 Hardcore Engineering Inc.
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
  import { type Doc, type Ref, type Space } from '@hcengineering/core'
  import documents, {
    type DocumentSpace,
    type DocumentSpaceType,
    type Project,
    type ProjectDocument
  } from '@hcengineering/controlled-documents'
  import { SpaceSelector, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { permissionsStore } from '@hcengineering/contact-resources'

  import { $locationStep as locationStep, locationStepUpdated } from '../../../stores/wizards/create-document'
  import DocumentParentSelector from '../../hierarchy/DocumentParentSelector.svelte'
  import ProjectSelector from '../../project/ProjectSelector.svelte'
  import documentsRes from '../../../plugin'
  import { getLatestProjectId } from '../../../utils'

  export let canProceed: boolean
  export let isTemplate: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let spaceRef: Ref<DocumentSpace> | undefined = $locationStep.space
  $: locationStepUpdated({ space: spaceRef })

  let space: DocumentSpace | undefined
  $: void fetchSpace($locationStep.space)

  let spaceType: DocumentSpaceType | undefined
  $: void fetchSpaceType(space?.type)

  let projectRef: Ref<Project> | undefined = $locationStep.project
  $: void selectProject(spaceRef)
  $: locationStepUpdated({ project: projectRef })

  async function selectProject (spaceRef: Ref<DocumentSpace> | undefined): Promise<void> {
    projectRef = spaceRef !== undefined ? await getLatestProjectId(spaceRef) : undefined
  }

  async function fetchSpace (id: Ref<DocumentSpace> | undefined): Promise<void> {
    space = id === undefined ? undefined : await client.findOne(documents.class.DocumentSpace, { _id: id })
  }

  async function fetchSpaceType (id: Ref<DocumentSpaceType> | undefined): Promise<void> {
    spaceType = id === undefined ? undefined : await client.findOne(documents.class.DocumentSpaceType, { _id: id }, {})
  }

  function handleParentSelected (doc: Doc): void {
    let parent: Ref<ProjectDocument> | undefined

    if (hierarchy.isDerived(doc._class, documents.class.DocumentSpace)) {
      parent = undefined
    } else if (hierarchy.isDerived(doc._class, documents.class.ProjectDocument)) {
      parent = doc._id as Ref<ProjectDocument>
    }

    locationStepUpdated({ parent })
  }

  function handleProjectSelected (value: Ref<Project> | undefined): void {
    projectRef = value
  }

  const externalSpaces = hierarchy.getDescendants(documents.class.ExternalSpace)

  $: canProceed = $locationStep.space !== undefined && $locationStep.project !== undefined
  $: hasParentSelector = $locationStep.space !== documents.space.UnsortedTemplates
  $: restrictedSpaces = Object.entries($permissionsStore.ps)
    .filter(([, pss]) => !pss.has(documents.permission.CreateDocument))
    .map(([s]) => s) as Ref<Space>[]

  $: spaceQuery = isTemplate
    ? { _id: { $nin: restrictedSpaces }, archived: false, _class: { $nin: externalSpaces } }
    : { _id: { $nin: restrictedSpaces }, archived: false }
</script>

<div class="root">
  <div class="sectionTitle"><Label label={documentsRes.string.Space} /></div>
  <div class="flex-row-center flex-no-shrink flex-gap-4">
    <div class="space">
      <SpaceSelector
        _class={documents.class.DocumentSpace}
        query={spaceQuery}
        bind:space={spaceRef}
        label={documentsRes.string.Space}
        width="100%"
        justify="left"
        autoSelect={true}
      />
    </div>
    {#if space && spaceType && spaceType.projects}
      <div class="space">
        <ProjectSelector
          value={projectRef}
          space={space._id}
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
  {#if hasParentSelector}
    <div class="sectionTitle"><Label label={documents.string.Parent} /></div>
    <div class="parentText"><Label label={documentsRes.string.SelectParent} /></div>
    <div class="parentSelector">
      {#if space}
        <DocumentParentSelector
          {space}
          project={projectRef}
          selected={$locationStep.parent}
          collapsedPrefix="locationStep"
          on:selected={(e) => {
            handleParentSelected(e.detail)
          }}
        />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .sectionTitle {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;

    &:not(:first-child) {
      margin-top: 3rem;
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
