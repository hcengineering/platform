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
  import {
    type Action,
    getPlatformColorForTextDef,
    themeStore,
    navigate,
    IconEdit,
    Label,
    closeTooltip
  } from '@hcengineering/ui'
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
    createDocument,
    canCreateChildDocument,
    moveDocument,
    moveDocumentBefore,
    moveDocumentAfter
  } from '../../utils'

  import documents from '../../plugin'

  import DropArea from './DropArea.svelte'
  import DropMarker from './DropMarker.svelte'

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

  let docsByMeta = new Map<Ref<DocumentMeta>, WithLookup<ProjectMeta>>()
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
      docsByMeta = new Map(result.map((r) => [r.meta, r]))
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

  function getAllDescendants (obj: Ref<DocumentMeta>): Ref<DocumentMeta>[] {
    const result: Ref<DocumentMeta>[] = []
    const queue: Ref<DocumentMeta>[] = [obj]

    while (queue.length > 0) {
      const next = queue.pop()
      if (next === undefined) break

      const children = childrenByParent[next] ?? []
      const childrenRefs = children.map((p) => p.meta)
      result.push(...childrenRefs)
      queue.push(...childrenRefs)
    }

    return result
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

    if (
      spaceType?.projects === true &&
      (await isEditableProject(project)) &&
      (await canCreateChildDocument(space, true))
    ) {
      actions.push({
        icon: documents.icon.NewDocument,
        label: documents.string.CreateDocument,
        group: 'create',
        action: async () => {
          await createDocument(space)
        }
      })
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

  let parent: HTMLElement
  let draggedItem: Ref<DocumentMeta> | undefined = undefined
  let draggedOver: Ref<DocumentMeta> | undefined = undefined
  let draggedOverPos: 'before' | 'after' | undefined = undefined
  let draggedOverTop: number = 0
  let cannotDropTo: Ref<DocumentMeta>[] = []

  function canDrop (object: Ref<DocumentMeta>, target: Ref<DocumentMeta>): boolean {
    if (object === target) return false
    if (cannotDropTo.includes(target)) return false

    return true
  }

  function onDragStart (event: DragEvent, object: Ref<DocumentMeta>): void {
    // no prevent default to leverage default rendering
    // event.preventDefault()
    if (event.dataTransfer === null || event.target === null) {
      return
    }

    cannotDropTo = [object, ...getAllDescendants(object)]

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
    draggedItem = object

    closeTooltip()
  }

  function getDropPosition (event: DragEvent): { pos: 'before' | 'after' | undefined, top: number } {
    const parentRect = parent.getBoundingClientRect()
    const targetRect = (event.target as HTMLElement).getBoundingClientRect()
    const dropPosition = event.clientY - targetRect.top

    const before = dropPosition >= 0 && dropPosition < targetRect.height / 6
    const after = dropPosition <= targetRect.height && dropPosition > (5 * targetRect.height) / 6

    const pos = before ? 'before' : after ? 'after' : undefined
    const top = pos === 'before' ? targetRect.top - parentRect.top - 1 : targetRect.bottom - parentRect.top - 1

    return { pos, top }
  }

  function onDragOver (event: DragEvent, object: Ref<DocumentMeta>): void {
    event.preventDefault()
    // this is an ugly solution to control drop effect
    // we drag and drop elements that are in the depth of components hierarchy
    // so we cannot access them directly
    if (!(event.target as HTMLElement).draggable) return
    if (event.dataTransfer === null || event.target === null || draggedItem === object) {
      return
    }

    if (draggedItem !== undefined && canDrop(draggedItem, object)) {
      event.dataTransfer.dropEffect = 'move'
      draggedOver = object

      const { pos, top } = getDropPosition(event)
      draggedOverPos = pos
      draggedOverTop = top
    } else {
      event.dataTransfer.dropEffect = 'none'
    }
  }

  function onDragEnd (event: DragEvent): void {
    event.preventDefault()
    draggedItem = undefined
    draggedOver = undefined
    draggedOverPos = undefined
  }

  function onDrop (event: DragEvent, object: Ref<DocumentMeta>): void {
    event.preventDefault()
    if (event.dataTransfer === null) {
      return
    }
    if (draggedItem !== undefined && canDrop(draggedItem, object)) {
      const doc = docsByMeta.get(draggedItem)
      const target = docsByMeta.get(object)

      if (doc !== undefined && target !== undefined && doc._id !== target._id) {
        if (object === documents.ids.NoParent) {
          void moveDocument(doc, doc.space)
        } else if (target !== undefined) {
          const { pos } = getDropPosition(event)
          if (pos === 'before') {
            void moveDocumentBefore(doc, target)
          } else if (pos === 'after') {
            void moveDocumentAfter(doc, target)
          } else if (doc.parent !== object) {
            void moveDocument(doc, target.space, target)
          }
        }
      }
    }
    draggedItem = undefined
    draggedOver = undefined
  }
</script>

<div bind:this={parent} class="flex-col relative">
  {#if draggedOver === documents.ids.NoParent}
    <DropArea />
  {/if}

  {#if draggedOver && draggedOverPos}
    <DropMarker top={draggedOverTop} />
  {/if}

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
    draggable
    on:drop={(evt) => {
      onDrop(evt, documents.ids.NoParent)
    }}
    on:dragover={(evt) => {
      onDragOver(evt, documents.ids.NoParent)
    }}
    on:dragstart={(evt) => {
      evt.preventDefault()
    }}
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
        {onDragStart}
        {onDragEnd}
        {onDragOver}
        {onDrop}
        {draggedItem}
        {draggedOver}
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
</div>

<style lang="scss">
  .pseudo-element {
    height: 2rem;
    margin: 0 0.75rem;
    padding-left: 2.5rem;
    padding-right: 0.75rem;
  }
</style>
