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
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ContextId, parseContext, Process, SelectedExecutionContext, UserResult } from '@hcengineering/process'
  import { Button, eventToHTMLElement, SelectPopup, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import ContextCriteria from '../criterias/ContextCriteria.svelte'

  export let process: Process
  export let result: Record<ContextId, any> = {}
  export let value: string | undefined
  export let readonly: boolean

  const client = getClient()
  const dispatch = createEventDispatcher()

  let results: UserResult[] = []

  let keys = Object.keys(result) as ContextId[]

  function getResults (_id: string | undefined): void {
    results = []
    if (_id == null) return
    const ctx = parseContext(_id)
    if (ctx?.type !== 'context') return
    const context = process.context[ctx.id]
    if (context === undefined) return
    const transition = client.getModel().findObject(context.producer)
    if (transition == null) return
    results = transition.actions.find((a) => a._id === context.action)?.results ?? []
  }

  $: getResults(value)

  $: availableResults = results.filter((r) => !keys.includes(r._id))

  function addKey (key: ContextId): void {
    keys = [...keys, key]
  }

  function onAdd (e: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: availableResults.map((p) => {
          return { id: p._id, text: p.name }
        })
      },
      eventToHTMLElement(e),
      (res) => {
        if (res != null) {
          addKey(res)
        }
      }
    )
  }

  function change (e: CustomEvent<any>, key: string): void {
    if (e.detail !== undefined) {
      ;(result as any)[key] = e.detail
      dispatch('change', result)
    }
  }

  function remove (key: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (result as any)[key]
    keys = keys.filter((k) => k !== key)
    dispatch('change', result)
  }
</script>

{#each keys as key}
  <ContextCriteria
    {process}
    value={result[key]}
    contextId={key}
    on:change={(e) => {
      change(e, key)
    }}
    on:delete={() => {
      remove(key)
    }}
  />
{/each}
{#if !readonly && availableResults.length > 0}
  <div class="flex-center mt-4">
    <Button label={presentation.string.Add} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
  </div>
{/if}
