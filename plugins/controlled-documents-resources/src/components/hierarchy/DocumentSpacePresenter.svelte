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
  import { WithLookup, type Doc, type Ref, type Space } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'
  import { type Action, getPlatformColorForTextDef, themeStore, navigate, IconEdit, Label } from '@hcengineering/ui'
  import { getActions as getContributedActions, TreeNode, TreeItem } from '@hcengineering/view-resources'
  import { ActionGroup } from '@hcengineering/view'
  import {
    type ControlledDocument,
    type DocumentMeta,
    type DocumentSpace,
    type DocumentSpaceType,
    type Project,
    type ProjectDocument,
    type ProjectMeta,
    getDocumentName
  } from '@hcengineering/controlled-documents'

  import ProjectSelector from '../project/ProjectSelector.svelte'
  import DocHierarchyLevel from './DocHierarchyLevel.svelte'
  import { getDocumentIdFromFragment, getProjectDocumentLink } from '../../navigation'
  import {
    getCurrentProject,
    getLatestProjectId,
    setCurrentProject,
    getProjectDocsHierarchy,
    isEditableProject,
    createDocument
  } from '../../utils'

  import documents from '../../plugin'

  export let space: DocumentSpace
  export let currentSpace: Ref<Space> | undefined
  export let currentFragment: string | undefined
  export let getActions: (space: Space) => Promise<Action[]> = async () => []
  export let deselect: boolean = false
  export let forciblyСollapsed: boolean = false

  const client = getClient()

  let spaceType: DocumentSpaceType | undefined
  let pressed: boolean = false

  const spaceTypeQuery = createQuery()
  $: spaceTypeQuery.query(documents.class.DocumentSpaceType, { _id: space.type }, (result) => {
    ;[spaceType] = result
  })

  $: selected = getDocumentIdFromFragment(currentFragment ?? '')

  let project: Ref<Project> = documents.ids.NoProject
  $: void selectProject(space)

  let rootDocs: Array<WithLookup<ProjectMeta>> = []
  let childrenByParent: Record<Ref<DocumentMeta>, Array<WithLookup<ProjectMeta>>> = {}

  const projectMetaQ = createQuery()
  $: projectMetaQ.query(
    documents.class.ProjectMeta,
    {
      space: space._id,
      project
    },
    (result) => {
      ;({ rootDocs, childrenByParent } = getProjectDocsHierarchy(result))
    },
    {
      lookup: {
        meta: documents.class.DocumentMeta
      }
    }
  )

  let selectedControlledDoc: ControlledDocument | undefined = undefined

  $: if (selected !== undefined) {
    void client
      .findOne(
        documents.class.ProjectDocument,
        { _id: selected },
        {
          lookup: {
            document: documents.class.ControlledDocument
          }
        }
      )
      .then((result) => {
        if (result !== undefined) {
          selectedControlledDoc = result.$lookup?.document as ControlledDocument
        } else {
          // There's some issue with resolving which needs to be fixed later
          void client
            .findOne(documents.class.ControlledDocument, { _id: selected as unknown as Ref<ControlledDocument> })
            .then((result) => {
              selectedControlledDoc = result
            })
        }
      })
  } else {
    selectedControlledDoc = undefined
  }

  async function selectProject (space: DocumentSpace): Promise<void> {
    project = getCurrentProject(space._id) ?? (await getLatestProjectId(space._id, true)) ?? documents.ids.NoProject
  }

  function handleDocumentSelected (doc: WithLookup<ProjectDocument>): void {
    if (doc.$lookup?.document !== undefined) {
      const loc = getProjectDocumentLink(doc.$lookup?.document, doc.project)
      navigate(loc)
    }
  }

  async function getSpaceActions (space: DocumentSpace): Promise<Action[]> {
    const actions = await getActions(space)

    const action: Action = {
      icon: documents.icon.NewDocument,
      label: documents.string.CreateDocument,
      group: 'create',
      action: async () => {
        await createDocument(space)
      }
    }

    if (spaceType?.projects === true && (await isEditableProject(project))) {
      actions.push(action)
    }

    return orderActions(actions)
  }

  async function getDocumentActions (obj: Doc): Promise<Action[]> {
    const result: Action[] = []
    const extraActions = await getContributedActions(client, obj)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        group: act.context.group,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(obj, evt, act.actionProps)
        }
      })
    }

    return orderActions(result)
  }

  function orderActions (actions: Action[]): Action[] {
    const order: Record<ActionGroup, number> = {
      create: 1,
      edit: 2,
      copy: 3,
      associate: 4,
      tools: 5,
      other: 6,
      remove: 7
    }

    actions.sort((a, b) => order[(a.group as ActionGroup) ?? 'other'] - order[(b.group as ActionGroup) ?? 'other'])

    return actions
  }
</script>

<TreeNode
  _id={space?._id}
  folderIcon
  iconProps={{
    fill: getPlatformColorForTextDef(space.name, $themeStore.dark).icon
  }}
  title={space.name}
  highlighted={space._id === currentSpace && currentFragment !== undefined && !deselect}
  visible={(space._id === currentSpace && currentFragment !== undefined && !deselect) || forciblyСollapsed}
  showMenu={pressed}
  {forciblyСollapsed}
  actions={() => getSpaceActions(space)}
  type={'nested'}
>
  <svelte:fragment slot="extra">
    {#if spaceType?.projects === true}
      <ProjectSelector
        value={project}
        space={space?._id}
        maxWidth={'6rem'}
        kind={'ghost'}
        size={'x-small'}
        showDropdownIcon
        bind:pressed
        on:change={(evt) => {
          project = evt.detail
          setCurrentProject(space._id, project)
        }}
      />
    {/if}
  </svelte:fragment>

  {#if rootDocs.length > 0}
    <DocHierarchyLevel
      projectMeta={rootDocs}
      {childrenByParent}
      {selected}
      getMoreActions={getDocumentActions}
      on:selected={(e) => {
        handleDocumentSelected(e.detail)
      }}
    />
  {:else}
    <div class="pseudo-element flex-row-center content-dark-color text-md nowrap">
      <Label label={documents.string.NoDocuments} />
    </div>
  {/if}

  <svelte:fragment slot="visible">
    {#if (selected || forciblyСollapsed) && selectedControlledDoc}
      {@const doc = selectedControlledDoc}
      <TreeItem
        _id={doc._id}
        icon={documents.icon.Document}
        iconProps={{
          fill: 'currentColor'
        }}
        title={getDocumentName(doc)}
        actions={() => getDocumentActions(doc)}
        selected
        isFold
        empty
        forciblyСollapsed
      />
    {/if}
  </svelte:fragment>
</TreeNode>

<style lang="scss">
  .pseudo-element {
    height: 2rem;
    margin: 0 0.75rem;
    padding-left: 2.5rem;
    padding-right: 0.75rem;
  }
</style>
