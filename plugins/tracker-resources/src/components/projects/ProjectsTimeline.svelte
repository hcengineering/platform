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
  import { CheckBox, Spinner, Timeline, TimelineRow } from '@hcengineering/ui'
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
  >
    <svelte:fragment let:row>
      {#each itemModels as attributeModel, attributeModelIndex}
        {#if attributeModelIndex === 0}
          <div class="gridElement">
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
          <div class="gridElement">
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
    <div class="listGrid" class:fixed={rowIndex === selectedRowIndex}>
      <div class="contentWrapper">
        <div class="gridElement">
          <CheckBox checked={false} />
          <div class="ml-4">
            <Spinner size="small" />
          </div>
        </div>
      </div>
    </div>
  {/each}
{/if}

<style lang="scss">
  // .timeline-container {
  //   overflow: hidden;
  //   position: relative;
  //   display: flex;
  //   flex-direction: column;
  //   width: 100%;
  //   height: 100%;
  //   min-width: 0;
  //   min-height: 0;

  //   & > * {
  //     overscroll-behavior-x: contain;
  //   }
  // }
  .timeline-header {
    display: flex;
    align-items: center;
    min-height: 4rem;
    border-bottom: 1px solid var(--divider-color);
  }
  .timeline-header__title {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 2.25rem;
    height: 100%;
    background-color: var(--body-accent);
    box-shadow: var(--accent-shadow);
    // z-index: 2;
  }
  .timeline-header__time {
    // overflow: hidden;
    position: relative;
    flex-grow: 1;
    height: 100%;
    background-color: var(--body-color);
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 1) 2rem,
      rgba(0, 0, 0, 1) calc(100% - 2rem),
      rgba(0, 0, 0, 0) 100%
    );

    &-content {
      width: 100%;
      height: 100%;
      will-change: transform;

      .day,
      .month {
        position: absolute;
        pointer-events: none;
      }
      .month {
        width: max-content;
        top: 0.25rem;
        font-size: 1rem;
        color: var(--accent-color);

        &:first-letter {
          text-transform: uppercase;
        }
      }
      .day {
        bottom: 0.5rem;
        font-size: 1rem;
        color: var(--content-color);
        transform: translateX(-50%);
      }
      .cursor {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        padding-bottom: 1px;
        width: 1.75rem;
        height: 1.75rem;
        bottom: 0.375rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background-color: var(--primary-bg-color);
        border-radius: 50%;
        transform: translateX(-50%);
        pointer-events: none;
      }
    }
  }
  .todayMarker,
  .monthMarker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    height: 100%;
    pointer-events: none;
  }
  .monthMarker {
    border-left: 1px dashed var(--highlight-select);
  }
  .todayMarker {
    border-left: 1px solid var(--primary-bg-color);
  }

  .timeline-background__headers,
  .timeline-background__viewbox,
  .timeline-foreground__viewbox {
    overflow: hidden;
    position: absolute;
    top: 4rem;
    bottom: 0;
    height: 100%;
    z-index: -1;
  }
  .timeline-background__headers {
    left: 0;
    background-color: var(--body-accent);
  }
  .timeline-background__viewbox,
  .timeline-foreground__viewbox {
    right: 0;
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 1) 2rem,
      rgba(0, 0, 0, 1) calc(100% - 2rem),
      rgba(0, 0, 0, 0) 100%
    );
  }
  .timeline-foreground__viewbox {
    z-index: 1;
    pointer-events: none;
  }

  .timeline-splitter,
  .timeline-splitter::before {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    transform: translateX(-50%);
  }
  .timeline-splitter {
    width: 1px;
    background-color: var(--divider-color);
    cursor: col-resize;
    z-index: 3;
    transition-property: width, background-color;
    transition-timing-function: var(--timing-main);
    transition-duration: 0.1s;
    transition-delay: 0s;

    &:hover {
      width: 3px;
      background-color: var(--button-border-hover);
      transition-duration: 0.15s;
      transition-delay: 0.3s;
    }
    &::before {
      content: '';
      width: 10px;
      left: 50%;
    }
    &.moving {
      width: 2px;
      background-color: var(--primary-edit-border-color);
      transition-duration: 0.1s;
      transition-delay: 0s;
    }
  }

  .headerWrapper {
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 0;
    padding-left: 0.75rem;
    padding-right: 1.15rem;
    // border-bottom: 1px solid var(--accent-bg-color);
  }
  .contentWrapper {
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    flex-grow: 1;
    height: 100%;
    min-width: 0;
    min-height: 0;
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 1) 2rem,
      rgba(0, 0, 0, 1) calc(100% - 2rem),
      rgba(0, 0, 0, 0) 100%
    );

    &.nullRow {
      cursor: pointer;
    }
  }
  .timeline-wrapped_content {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    will-change: transform;
  }

  .timeline-action__button,
  .project-item {
    position: absolute;
    display: flex;
    align-items: center;
    padding: 0.5rem;
    box-shadow: var(--button-shadow);
  }
  .project-item {
    top: 0.25rem;
    bottom: 0.25rem;
    background-color: var(--button-bg-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.75rem;

    &:hover {
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
    }
    &.noTarget {
      mask-image: linear-gradient(to left, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 1) 2rem);
      border-right-color: transparent;
    }

    .project-presenter {
      display: flex;
      align-items: center;

      .space {
        flex-shrink: 0;
        width: 0.25rem;
        min-width: 0.25rem;
        max-width: 0.25rem;
      }
    }
  }
  .timeline-action__button {
    top: 0.625rem;
    bottom: 0.625rem;
    width: 2rem;
    color: var(--content-color);
    background-color: var(--button-bg-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.5rem;

    &:hover {
      color: var(--accent-color);
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
    }

    &.left {
      left: 1rem;
    }
    &.right {
      right: 1rem;
    }
    &.add {
      transform: translateX(-50%);
      pointer-events: none;
    }
  }

  .listGrid {
    display: flex;
    justify-content: stretch;
    align-items: center;
    flex-shrink: 0;
    width: 100%;
    height: 3.25rem;
    min-height: 0;
    color: var(--caption-color);
    z-index: 2;

    &.mListGridChecked {
      .headerWrapper {
        background-color: var(--highlight-select);
      }
      .contentWrapper {
        background-color: var(--trans-content-05);
      }
      .eListGridCheckBox {
        opacity: 1;
      }
    }

    &.mListGridSelected {
      .headerWrapper {
        background-color: var(--highlight-select-hover);
      }
      .contentWrapper {
        background-color: var(--trans-content-10);
      }
    }

    .eListGridCheckBox {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
    }

    &:hover .eListGridCheckBox {
      opacity: 1;
    }
  }

  .filler {
    display: flex;
    flex-grow: 1;
  }

  .gridElement {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-left: 0.5rem;

    &:first-child {
      margin-left: 0;
    }
  }
  .projectPresenter {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 5.5rem;
    margin-left: 0.5rem;
  }
</style>
