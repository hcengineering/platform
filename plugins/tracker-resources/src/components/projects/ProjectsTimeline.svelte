<!--
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
-->
<script lang="ts">
  import contact from '@hcengineering/contact'
  import { Class, Doc, FindOptions, getObjectValue, Ref, Timestamp } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { CheckBox, Spinner, Timeline } from '@hcengineering/ui'
  import type { TimelineRow, TimelineSelect } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey } from '@hcengineering/view'
  import { buildModel, LoadingProps } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectPresenter from './ProjectPresenter.svelte'

  export let _class: Ref<Class<Doc>>
  export let itemsConfig: (BuildModelKey | string)[]
  export let selectedObjectIds: Doc[] = []
  export let selectedRowIndex: number | undefined = undefined
  export let projects: Project[] | undefined = undefined
  export let loadingProps: LoadingProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const client = getClient()

  const baseOptions: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee,
      status: tracker.class.IssueStatus
    }
  }

  $: options = { ...baseOptions } as FindOptions<Project>
  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))
  let selectedRows: number[] = []
  $: if (selectedObjectIdsSet.size > 0 && projects !== undefined) {
    const tRows: number[] = []
    selectedObjectIdsSet.forEach((it) => {
      const index = projects?.findIndex((f) => f._id === it)
      if (index !== undefined) tRows.push(index)
    })
    selectedRows = tRows
  } else selectedRows = []

  export const onObjectChecked = (docs: Doc[], value: boolean) => {
    dispatch('check', { docs, value })
  }

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  export const onElementSelected = (offset: 1 | -1 | 0, docObject?: Doc) => {
    if (!projects) return

    let position =
      (docObject !== undefined ? projects?.findIndex((x) => x._id === docObject?._id) : selectedRowIndex) ?? -1

    position += offset
    if (position < 0) position = 0
    if (position >= projects.length) position = projects.length - 1
    selectedRowIndex = position
    handleRowFocused(projects[position])

    // if (objectRef) {
    //   objectRef.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    // }
  }

  const getLoadingElementsLength = (props: LoadingProps, options?: FindOptions<Doc>) => {
    if (options?.limit && options?.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }

  let itemModels: AttributeModel[] | undefined = undefined
  $: buildModel({ client, _class, keys: itemsConfig, lookup: options.lookup }).then((res) => (itemModels = res))

  let lines: TimelineRow[] | undefined
  $: lines = projects?.map((proj) => {
    const tR: TimelineRow = { items: [] }
    tR.items = [
      {
        icon: proj.icon,
        presenter: ProjectPresenter,
        props: { value: proj },
        startDate: proj.startDate as Timestamp,
        targetDate: proj.targetDate as Timestamp
      }
    ]
    return tR
  })

  const addStartDate = async (row: TimelineSelect) => {
    if (projects) await client.update(projects[row.row], { startDate: row.point.date.getTime() })
  }
</script>

{#if projects && itemModels && lines}
  <Timeline
    {lines}
    {selectedRows}
    selectedRow={selectedRowIndex}
    on:row-focus={(ev) => {
      if (ev.detail !== undefined && projects !== undefined) handleRowFocused(projects[ev.detail])
    }}
    on:check={(ev) => {
      if (ev.detail !== undefined && projects !== undefined) onObjectChecked([projects[ev.detail.row]], ev.detail.value)
    }}
    on:select={(ev) => {
      if (ev.detail !== undefined && projects !== undefined && ev.detail.range === null) addStartDate(ev.detail)
    }}
  >
    <svelte:fragment let:row>
      {#each itemModels as attributeModel, attributeModelIndex}
        {#if attributeModelIndex === 0}
          <div class="timeline-row__header-item">
            <div class="iconPresenter">
              <svelte:component
                this={attributeModel.presenter}
                value={getObjectValue(attributeModel.key, projects[row]) ?? ''}
                {...attributeModel.props}
              />
            </div>
          </div>
        {:else if attributeModelIndex === 1}
          <div class="projectPresenter flex-grow">
            <svelte:component
              this={attributeModel.presenter}
              value={getObjectValue(attributeModel.key, projects[row]) ?? ''}
              {...attributeModel.props}
            />
          </div>
          <div class="filler" />
        {:else}
          <div class="timeline-row__header-item">
            <svelte:component
              this={attributeModel.presenter}
              value={getObjectValue(attributeModel.key, projects[row]) ?? ''}
              parentId={projects[row]._id}
              {...attributeModel.props}
            />
          </div>
        {/if}
      {/each}
    </svelte:fragment>
  </Timeline>
{:else if loadingProps !== undefined}
  {#each Array(getLoadingElementsLength(loadingProps, options)) as _, rowIndex}
    <div class="timeline-row__container" class:fixed={rowIndex === selectedRowIndex}>
      <div class="timeline-row__header-item">
        <CheckBox checked={false} />
        <div class="ml-4">
          <Spinner size="small" />
        </div>
      </div>
    </div>
  {/each}
{/if}

<style lang="scss">
  .filler {
    display: flex;
    flex-grow: 1;
  }
  .iconPresenter {
    padding-left: 0.45rem;
  }
  .projectPresenter {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 5.5rem;
    margin-left: 0.5rem;
  }
</style>
