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
  import { Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process, State, type Method, type Step } from '@hcengineering/process'
  import { Component, Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import { createEventDispatcher } from 'svelte'

  export let step: Step<Doc>
  export let state: State
  export let process: Process

  const client = getClient()
  const dispatch = createEventDispatcher()

  $: method = getMethod(step.methodId)

  function change (e: CustomEvent<any>): void {
    step = e.detail
    dispatch('change', step)
  }

  function getMethod (_id: Ref<Method<Doc>>): Method<Doc> {
    if (method?._id !== _id) {
      const res = client.getModel().findAllSync(plugin.class.Method, { _id })[0]
      return res
    }
    return method
  }
</script>

{#if method !== undefined}
  <div class="content clear-mins">
    <div class="header">
      <div class="fs-title title text-xl">
        <Label label={method.label} />
      </div>
      {#if method.description}
        <div class="descr">
          <Label label={method.description} />
        </div>
      {/if}
    </div>
    {#if method.editor !== undefined}
      <Component is={method.editor} props={{ step, state, process }} on:change={change} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .header {
    padding: 1rem 1.25rem 2rem 1.25rem;
  }

  .title {
    padding-bottom: 1rem;
  }
</style>
