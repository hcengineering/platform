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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, getObjectValue } from '@anticrm/core'
  import { SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { CheckBox, Loading, showPopup, Spinner, IconMoreV, Tooltip } from '@anticrm/ui'
  import { BuildModelKey } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { buildModel, LoadingProps, Menu } from '@anticrm/view-resources'
  import tracker from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let leftItemsConfig: (BuildModelKey | string)[]
  export let rightItemsConfig: (BuildModelKey | string)[] | undefined = undefined
  export let options: FindOptions<Doc> | undefined = undefined
  export let query: DocumentQuery<Doc>

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const DOCS_MAX_AMOUNT = 200
  const liveQuery = createQuery()
  const sort = { modifiedOn: SortingOrder.Descending }

  let selectedIssueIds = new Set<Ref<Doc>>()
  let selectedRowIndex: number | undefined
  let isLoading = false
  let docObjects: Doc[] | undefined
  let queryIndex = 0

  const updateData = async (_class: Ref<Class<Doc>>, query: DocumentQuery<Doc>, options?: FindOptions<Doc>) => {
    const i = ++queryIndex

    isLoading = true

    liveQuery.query(
      _class,
      query,
      (result) => {
        if (i !== queryIndex) {
          return // our data is invalid.
        }

        docObjects = result
        dispatch('content', docObjects)
        isLoading = false
      },
      { sort, ...options, limit: DOCS_MAX_AMOUNT }
    )
  }

  $: updateData(_class, query, options)

  const client = getClient()

  const showMenu = async (event: MouseEvent, docObject: Doc, rowIndex: number) => {
    selectedRowIndex = rowIndex

    showPopup(Menu, { object: docObject, baseMenuClass }, event.target as HTMLElement, () => {
      selectedRowIndex = undefined
    })
  }

  const handleIssueSelected = (id: Ref<Doc>, event: CustomEvent<boolean>) => {
    if (event.detail) {
      selectedIssueIds.add(id)
    } else {
      selectedIssueIds.delete(id)
    }

    selectedIssueIds = selectedIssueIds
  }

  const getLoadingElementsLength = (props: LoadingProps, options?: FindOptions<Doc>) => {
    if (options?.limit && options?.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }

  const buildItemModels = async () => {
    const leftModels = await buildModel({ client, _class, keys: leftItemsConfig, options })
    const rightModels = rightItemsConfig && (await buildModel({ client, _class, keys: rightItemsConfig, options }))

    return { leftModels, rightModels }
  }
</script>

{#await buildItemModels()}
  {#if !isLoading}
    <Loading />
  {/if}
{:then itemModels}
  <div class="listRoot">
    {#if docObjects}
      {#each docObjects as docObject, rowIndex (docObject._id)}
        <div
          class="listGrid"
          class:mListGridChecked={selectedIssueIds.has(docObject._id)}
          class:mListGridFixed={rowIndex === selectedRowIndex}
        >
          <div class="modelsContainer">
            {#each itemModels.leftModels as attributeModel, attributeModelIndex}
              {#if attributeModelIndex === 0}
                <div class="gridElement">
                  <Tooltip direction={'bottom'} label={tracker.string.SelectIssue}>
                    <div class="eListGridCheckBox ml-2">
                      <CheckBox
                        checked={selectedIssueIds.has(docObject._id)}
                        on:value={(event) => {
                          handleIssueSelected(docObject._id, event)
                        }}
                      />
                    </div>
                  </Tooltip>
                  <div class="priorityPresenter">
                    <svelte:component
                      this={attributeModel.presenter}
                      value={getObjectValue(attributeModel.key, docObject) ?? ''}
                      {...attributeModel.props}
                    />
                  </div>
                </div>
              {:else if attributeModelIndex === 1}
                <div class="issuePresenter">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    {...attributeModel.props}
                  />
                  <div
                    id="context-menu"
                    class="eIssuePresenterContextMenu"
                    on:click={(event) => showMenu(event, docObject, rowIndex)}
                  >
                    <IconMoreV size={'small'} />
                  </div>
                </div>
              {:else}
                <div class="gridElement">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    {...attributeModel.props}
                  />
                </div>
              {/if}
            {/each}
          </div>
          {#if itemModels.rightModels}
            <div class="modelsContainer">
              {#each itemModels.rightModels as attributeModel}
                <div class="gridElement">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject) ?? ''}
                    {...attributeModel.props}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {:else if loadingProps !== undefined}
      {#each Array(getLoadingElementsLength(loadingProps, options)) as _, rowIndex}
        <div class="listGrid mListGridIsLoading" class:fixed={rowIndex === selectedRowIndex}>
          <div class="modelsContainer">
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

{#if isLoading}
  <Loading />
{/if}

<style lang="scss">
  .listRoot {
    width: 100%;
  }

  .listGrid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);

    &.mListGridChecked {
      background-color: var(--theme-table-bg-hover);

      .eListGridCheckBox {
        opacity: 1;
      }
    }

    &.mListGridFixed {
      .eIssuePresenterContextMenu {
        visibility: visible;
      }
    }

    &.mListGridIsLoading {
      justify-content: flex-start;
    }

    &:hover {
      background-color: var(--theme-table-bg-hover);
    }

    .eListGridCheckBox {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.03rem;
      border-radius: 0.25rem;
      background-color: rgba(247, 248, 248, 0.5);
      opacity: 0;

      &:hover {
        opacity: 1;
      }
    }
  }

  .modelsContainer {
    display: flex;
    align-items: center;
  }

  .gridElement {
    display: flex;
    align-items: center;
    justify-content: start;
    margin-left: 0.5rem;

    &:first-child {
      margin-left: 0;
    }
  }

  .priorityPresenter {
    padding-left: 0.75rem;
  }

  .issuePresenter {
    display: flex;
    align-items: center;
    margin-left: 0.5rem;

    .eIssuePresenterContextMenu {
      visibility: hidden;
      opacity: 0.6;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }

    &:hover {
      .eIssuePresenterContextMenu {
        visibility: visible;
      }
    }
  }
</style>
