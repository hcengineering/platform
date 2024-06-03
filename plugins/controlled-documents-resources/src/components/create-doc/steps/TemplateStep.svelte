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
  import { slide } from 'svelte/transition'
  import { Data, Ref, WithLookup } from '@hcengineering/core'
  import { IconCollapseArrow, RadioButton } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import documents, {
    type ControlledDocument,
    type DocumentCategory,
    type DocumentSpace,
    type DocumentTemplate,
    DocumentState
  } from '@hcengineering/controlled-documents'

  import { $templateStep as templateStep, templateStepUpdated } from '../../../stores/wizards/create-document'

  export let docObject: Data<ControlledDocument> | undefined = undefined
  export let canProceed: boolean

  const client = getClient()
  let docSpaces: Ref<DocumentSpace>[] = []
  $: void client
    .findAll(
      documents.class.DocumentSpace,
      {},
      {
        projection: {
          _id: 1
        }
      }
    )
    .then((res) => {
      docSpaces = res.map((s) => s._id)
    })

  let templatesByCategory: Record<string, WithLookup<DocumentTemplate>[]>
  let categoriesById: Record<Ref<DocumentCategory>, DocumentCategory>

  $: if (docSpaces.length > 0) {
    void client
      .findAll(
        documents.mixin.DocumentTemplate,
        {
          space: { $in: docSpaces },
          state: DocumentState.Effective
        },
        {
          lookup: {
            category: documents.class.DocumentCategory
          }
        }
      )
      .then((res) => {
        const newTemplatesByCategory: typeof templatesByCategory = {}
        const newCategoriesById: typeof categoriesById = {}
        for (const doc of res) {
          const category = doc.$lookup?.category
          const categoryId = category?._id ?? 'unassigned'

          if (categoryId !== 'unassigned' && category !== undefined && newCategoriesById[categoryId] === undefined) {
            newCategoriesById[categoryId] = category
          }

          if (newTemplatesByCategory[categoryId] === undefined) {
            newTemplatesByCategory[categoryId] = []
          }

          newTemplatesByCategory[categoryId]?.push(doc)
        }
        templatesByCategory = newTemplatesByCategory
        categoriesById = newCategoriesById
      })
  }

  $: canProceed = docObject?.template !== undefined && docObject.template !== ''
  $: categoriesIds = categoriesById !== undefined ? (Object.keys(categoriesById) as Ref<DocumentCategory>[]) : []

  function handleExpanderToggled (id: Ref<DocumentCategory>): void {
    const categories = { ...$templateStep.collapsedCategories }

    if (categories[id] === undefined) {
      categories[id] = 'x'
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete categories[id]
    }

    templateStepUpdated({ ...$templateStep, collapsedCategories: categories })
  }

  function handleTemplateSelected (tmp: Ref<DocumentTemplate>, prefix: string, seqNumber: number): void {
    if (docObject === undefined) {
      return
    }

    docObject.template = tmp
    docObject.seqNumber = seqNumber
    docObject.prefix = prefix
    docObject.code = ''
  }
</script>

{#if docObject !== undefined}
  <div class="root antiAccordion">
    {#each categoriesIds as catId}
      {@const expanded = $templateStep.collapsedCategories[catId] === undefined}
      <div class="category">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="catHeader"
          on:click={() => {
            handleExpanderToggled(catId)
          }}
        >
          <div class="expander" class:expanded>
            <IconCollapseArrow size="small" />
          </div>
          <span>{categoriesById[catId]?.title}</span>
        </div>

        {#if expanded}
          <div class="templates" transition:slide|local>
            {#each templatesByCategory[catId] as tmp}
              <RadioButton
                value={tmp._id}
                group={docObject.template}
                action={() => {
                  handleTemplateSelected(tmp._id, tmp.docPrefix, tmp.sequence + 1)
                }}
              >
                <div class="template">
                  <div class="tmpHeader">{`${tmp.docPrefix} (${tmp.title})`}</div>
                  {#if tmp.abstract}
                    <div class="tmpDescr">{tmp.abstract}</div>
                  {/if}
                </div>
              </RadioButton>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .root {
    height: 100%;
    width: 100%;
  }

  .category {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    &:not(:first-child) {
      margin-top: 1.5rem;
    }
  }

  .catHeader {
    display: flex;
    align-items: center;
    font-weight: 500;
    cursor: pointer;
  }

  .expander {
    transform-origin: center;
    transition: transform 0.15s ease-in-out;

    &.expanded {
      transform: rotate(90deg);
    }
  }

  .templates {
    padding: 0 1rem;
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  .template {
    margin-left: 0.625rem;
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--theme-divider-color);
    display: flex;
    flex-direction: column;
  }

  .tmpHeader {
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .tmpDescr {
    color: var(--theme-dark-color);
    line-height: 1.25rem;
  }
</style>
