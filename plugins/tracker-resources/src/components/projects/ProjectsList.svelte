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
  import { Class, Doc, FindOptions, getObjectValue, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { CheckBox, Spinner, tooltip } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { buildModel, LoadingProps } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let itemsConfig: (BuildModelKey | string)[]
  export let selectedObjectIds: Doc[] = []
  export let selectedRowIndex: number | undefined = undefined
  export let projects: Project[] | undefined = undefined
  export let loadingProps: LoadingProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const client = getClient()
  const objectRefs: HTMLElement[] = []

  const baseOptions: FindOptions<Issue> = {
    lookup: {
      assignee: contact.class.Employee,
      status: tracker.class.IssueStatus
    }
  }

  $: options = { ...baseOptions } as FindOptions<Project>
  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))
  $: objectRefs.length = projects?.length ?? 0

  export const onObjectChecked = (docs: Doc[], value: boolean) => {
    dispatch('check', { docs, value })
  }

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  export const onElementSelected = (offset: 1 | -1 | 0, docObject?: Doc) => {
    if (!projects) {
      return
    }

    let position =
      (docObject !== undefined ? projects?.findIndex((x) => x._id === docObject?._id) : selectedRowIndex) ?? -1

    position += offset

    if (position < 0) {
      position = 0
    }

    if (position >= projects.length) {
      position = projects.length - 1
    }

    const objectRef = objectRefs[position]

    selectedRowIndex = position

    handleRowFocused(projects[position])

    if (objectRef) {
      objectRef.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }

  const getLoadingElementsLength = (props: LoadingProps, options?: FindOptions<Doc>) => {
    if (options?.limit && options?.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }
</script>

{#await buildModel({ client, _class, keys: itemsConfig, lookup: options.lookup }) then itemModels}
  <div class="listRoot">
    {#if projects}
      {#each projects as docObject (docObject._id)}
        <div
          bind:this={objectRefs[projects.findIndex((x) => x === docObject)]}
          class="listGrid"
          class:mListGridChecked={selectedObjectIdsSet.has(docObject._id)}
          class:mListGridFixed={selectedRowIndex === projects.findIndex((x) => x === docObject)}
          class:mListGridSelected={selectedRowIndex === projects.findIndex((x) => x === docObject)}
          on:focus={() => {}}
          on:mouseover={() => handleRowFocused(docObject)}
        >
          <div class="contentWrapper">
            {#each itemModels as attributeModel, attributeModelIndex}
              {#if attributeModelIndex === 0}
                <div class="gridElement">
                  <div
                    class="eListGridCheckBox"
                    use:tooltip={{ direction: 'bottom', label: tracker.string.SelectIssue }}
                  >
                    <CheckBox
                      checked={selectedObjectIdsSet.has(docObject._id)}
                      on:value={(event) => {
                        onObjectChecked([docObject], event.detail)
                      }}
                    />
                  </div>
                  <div class="iconPresenter">
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      {...attributeModel.props}
                    />
                  </div>
                </div>
              {:else if attributeModelIndex === 1}
                <div class="projectPresenter flex-grow">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    {...attributeModel.props}
                  />
                </div>
                <div class="filler" />
              {:else}
                <div class="gridElement">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    parentId={docObject._id}
                    {...attributeModel.props}
                  />
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
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
  </div>
{/await}

<style lang="scss">
  .listRoot {
    width: 100%;
  }

  .contentWrapper {
    display: flex;
    align-items: center;
    height: 100%;
    padding-left: 0.75rem;
    padding-right: 1.15rem;
  }

  .listGrid {
    width: 100%;
    height: 3.25rem;
    color: var(--caption-color);
    border-bottom: 1px solid var(--divider-color);

    &.mListGridChecked {
      background-color: var(--highlight-select);
      border-bottom-color: var(--highlight-select-border);

      .eListGridCheckBox {
        opacity: 1;
      }
    }

    &.mListGridSelected {
      background-color: var(--highlight-hover);
    }
    &.mListGridChecked.mListGridSelected {
      background-color: var(--highlight-select-hover);
    }

    .eListGridCheckBox {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;

      &:hover {
        opacity: 1;
      }
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
