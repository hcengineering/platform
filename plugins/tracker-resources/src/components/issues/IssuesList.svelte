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
  import { CheckBox, Loading, showPopup, Spinner, IconMoreV } from '@anticrm/ui'
  import { BuildModelKey } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { buildModel, LoadingProps, Menu } from '@anticrm/view-resources'
  import ControlCheckBox from './ControlCheckBox.svelte'

  export let _class: Ref<Class<Doc>>
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: (BuildModelKey | string)[]
  export let options: FindOptions<Doc> | undefined = undefined
  export let query: DocumentQuery<Doc>

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const DOCS_MAX_AMOUNT = 200
  const liveQuery = createQuery()
  const sort = { modifiedOn: SortingOrder.Descending }
  const checkBoxClass = 'antiTable-cells__checkCell'

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

  const handleIssueSelected = (id: Ref<Doc>, isSelected: boolean) => {
    if (isSelected) {
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
</script>

{#await buildModel({ client, _class, keys: config, options })}
  {#if !isLoading}
    <Loading />
  {/if}
{:then attributeModels}
  <div class="listRoot">
    {#if docObjects}
      {#each docObjects as docObject, rowIndex (docObject._id)}
        <div class="listGrid" class:mListGridChecked={selectedIssueIds.has(docObject._id)}>
          {#each attributeModels as attributeModel, attributeModelIndex}
            {#if attributeModelIndex === 0}
              <div class="gridElement">
                <ControlCheckBox
                  id={docObject._id}
                  controlCheckBoxClass={checkBoxClass}
                  isChecked={selectedIssueIds.has(docObject._id)}
                  onSelected={handleIssueSelected}
                />
                <div class="issuePresenter">
                  <svelte:component
                    this={attributeModel.presenter}
                    value={getObjectValue(attributeModel.key, docObject)}
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
              </div>
            {:else}
              <div class="gridElement">
                <svelte:component
                  this={attributeModel.presenter}
                  value={getObjectValue(attributeModel.key, docObject)}
                  {...attributeModel.props}
                />
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    {:else if loadingProps !== undefined}
      {#each Array(getLoadingElementsLength(loadingProps, options)) as _, rowIndex}
        <div class="listGrid">
          {#each attributeModels as _, attributeModelIndex}
            {#if attributeModelIndex === 0}
              <div class="gridElement">
                <div class={checkBoxClass}>
                  <CheckBox checked={false} />
                </div>
              </div>
              <div>
                <Spinner size="small" />
              </div>
            {/if}
          {/each}
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
    display: grid;
    grid-template-columns: 9rem auto 4rem 2rem;
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);

    &.mListGridChecked {
      background-color: var(--theme-table-bg-hover);
    }

    &:hover {
      background-color: var(--theme-table-bg-hover);
    }
  }

  .gridElement {
    display: flex;
    align-items: center;
    justify-content: start;
  }

  .issuePresenter {
    display: flex;
    align-items: center;
    padding: 0 1rem;

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
