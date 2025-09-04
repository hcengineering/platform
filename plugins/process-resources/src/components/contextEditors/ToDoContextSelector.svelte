<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import {
    ContextId,
    MethodParams,
    parseContext,
    Process,
    ProcessToDo,
    SelectedContext,
    SelectedExecutionContext
  } from '@hcengineering/process'
  import ui, {
    Button,
    ButtonKind,
    ButtonSize,
    eventToHTMLElement,
    Label,
    SelectPopup,
    SelectPopupValueType,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ExecutionContextPresenter from '../attributeEditors/ExecutionContextPresenter.svelte'
  import ProcessContextPresenter from './ProcessContextPresenter.svelte'

  export let readonly: boolean
  export let process: Process
  export let value: string
  export let skipRollback: boolean = false

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  $: context = getContext(value)

  const client = getClient()

  function getContext (value: string): SelectedExecutionContext | undefined {
    const context = parseContext(value)
    if (context !== undefined && isExecutionContext(context)) {
      return context
    }
  }

  function isExecutionContext (context: SelectedContext): context is SelectedExecutionContext {
    return context.type === 'context'
  }

  const dispatch = createEventDispatcher()

  async function getPossibleContext (): Promise<SelectPopupValueType[]> {
    // todo filter to only possible todos, for now allow all...
    const res: SelectPopupValueType[] = []
    for (const key in process.context) {
      const ctx = process.context[key as ContextId]
      if (ctx._class === plugin.class.ProcessToDo) {
        if (skipRollback) {
          const transition = client.getModel().findObject(ctx.producer)
          if (transition === undefined) {
            continue
          }

          const action = transition.actions.find((a) => a._id === ctx.action)
          if (action === undefined) {
            continue
          }
          const params = (action.params ?? {}) as MethodParams<ProcessToDo>

          if (params.withRollback === true) {
            // skip rollback contexts
            continue
          }
        }
        const item: SelectPopupValueType = {
          id: key,
          component: ProcessContextPresenter,
          props: {
            context: ctx
          },
          isSelected: context?.id === key
        }
        res.push(item)
      }
    }
    return res
  }

  async function click (ev: MouseEvent): Promise<void> {
    if (readonly) {
      return
    }
    const value = await getPossibleContext()
    showPopup(
      SelectPopup,
      {
        value
      },
      eventToHTMLElement(ev),
      (result) => {
        if (result !== undefined) {
          dispatch(
            'change',
            '$' +
              JSON.stringify({
                type: 'context',
                id: result as ContextId,
                key: ''
              })
          )
        }
      }
    )
  }
</script>

<Button
  id="space.selector"
  disabled={readonly}
  {size}
  {kind}
  {justify}
  {width}
  notSelected={value == null}
  on:click={click}
>
  <div slot="content" class="overflow-label disabled text">
    {#if context === undefined}
      <Label label={ui.string.NotSelected} />
    {:else}
      <ExecutionContextPresenter {process} contextValue={context} />
    {/if}
  </div>
</Button>
