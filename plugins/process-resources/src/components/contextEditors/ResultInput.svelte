<!--
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { Analytics } from '@hcengineering/analytics'
  import card from '@hcengineering/card'
  import { type Class, type Doc, getObjectValue, type Markup, type Ref } from '@hcengineering/core'
  import presentation, {
    Card,
    getAttrEditor,
    getAttributePresenterClass,
    getClient,
    MessageViewer
  } from '@hcengineering/presentation'
  import { ContextId, ExecutionContext, UserResult } from '@hcengineering/process'
  import { type AnyComponent, Component, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { isRequiredValueFilled } from '../../required-value'
  import type { ResolvedUserResult } from '../../selection-space'

  export let results: ResolvedUserResult[]
  export let context: ExecutionContext
  export let doc: Doc
  export let description: Markup | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const h = client.getHierarchy()

  let values: Record<ContextId, any> = {}
  let loading = true

  async function fillValues (): Promise<void> {
    await Promise.all(
      results.map(async (result) => {
        try {
          const value = getVal(result)
          if (result.docQuery !== undefined && Object.keys(result.docQuery).length > 0 && value != null) {
            const ids = Array.isArray(value) ? value : [value]
            const excluded = result.docQuery._id
            const allowedIds =
              typeof excluded === 'object' && excluded.$nin !== undefined
                ? ids.filter((id) => !excluded.$nin?.includes(id))
                : ids
            const objects = await client.findAll(card.class.Card, { ...result.docQuery, _id: { $in: allowedIds } })
            values[result._id] = ids.every((id) => objects.some((object) => object._id === id)) ? value : undefined
          } else {
            values[result._id] = value
          }
        } catch (error) {
          values[result._id] = undefined
          Analytics.handleError(error instanceof Error ? error : new Error(String(error)))
        }
      })
    )
    values = values
    loading = false
  }

  function getVal (res: UserResult): any {
    if (res.key !== undefined) {
      return getObjectValue(res.key, doc) ?? context[res._id]
    }
    return context[res._id]
  }

  void fillValues()

  function getEditor (result: ResolvedUserResult): AnyComponent | undefined {
    const target = getAttributePresenterClass(h, result.type)
    if (
      result.docQuery !== undefined &&
      Object.keys(result.docQuery).length > 0 &&
      ['object', 'array'].includes(target.category) &&
      h.isDerived(target.attrClass, card.class.Card)
    ) {
      return h.classHierarchyMixin(
        card.class.Card as Ref<Class<Doc>>,
        target.category === 'array' ? view.mixin.ArrayEditor : view.mixin.AttributeEditor
      )?.inlineEditor
    }
    return getAttrEditor(result.type, h)
  }

  function save (): void {
    if (!canSaveValue) return
    dispatch('close', values)
  }

  function getOnChange (id: ContextId): (val: any) => void {
    return (val: any) => {
      values[id] = val
      values = values
    }
  }

  $: canSaveValue = !loading && results.every((result) => isRequiredValueFilled(values[result._id], result.type))
</script>

<Card
  width={'small'}
  on:close
  label={plugin.string.Result}
  canSave={canSaveValue}
  okAction={save}
  okLabel={presentation.string.Save}
>
  {#if description !== undefined && description.trim() !== ''}
    <div class="description">
      <MessageViewer message={description} />
    </div>
  {/if}
  <div class="grid">
    {#each results as result, i}
      {@const editor = getEditor(result)}
      <span
        class="labelOnPanel"
        use:tooltip={{
          props: { text: result.name }
        }}
      >
        {result.name}
      </span>
      {#if editor && !loading}
        <div class="w-full">
          <Component
            is={editor}
            props={{
              label: plugin.string.Result,
              placeholder: plugin.string.Result,
              kind: 'ghost',
              size: 'large',
              width: '100%',
              justify: 'left',
              type: result.type,
              docQuery: result.docQuery,
              value: values[result._id],
              onChange: getOnChange(result._id),
              onInput: getOnChange(result._id),
              focus
            }}
          />
        </div>
      {/if}
    {/each}
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }

  .description {
    margin: 0 0 1rem;
  }
</style>
