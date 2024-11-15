<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { ItemPresenter, ToDo } from '@hcengineering/time'
  import type { Class, Doc } from '@hcengineering/core'
  import type { ObjectPanel } from '@hcengineering/view'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, showPanel } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import time from '../plugin'
  import { DocReferencePresenter, getObjectLinkId } from '@hcengineering/view-resources'

  export let todo: ToDo
  export let kind: 'default' | 'todo-line' = 'default'
  export let withoutSpace: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  $: presenter = hierarchy.classHierarchyMixin<Doc, ItemPresenter>(todo.attachedToClass, time.mixin.ItemPresenter)

  let doc: Doc | undefined = undefined
  const docQuery = createQuery()
  $: docQuery.query(todo.attachedToClass, { _id: todo.attachedTo }, (res) => {
    doc = res[0]
  })

  async function click (event: MouseEvent): Promise<void> {
    event.stopPropagation()
    if (!doc) return
    const panelComponent = hierarchy.classHierarchyMixin<Class<Doc>, ObjectPanel>(doc._class, view.mixin.ObjectPanel)
    const component = panelComponent?.component ?? view.component.EditDoc
    const id = await getObjectLinkId(linkProviders, doc._id, doc._class, doc)

    showPanel(component, id, doc._class, 'content')
  }
</script>

{#if doc}
  {#if presenter?.presenter}
    {#if kind === 'default'}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="cursor-pointer clear-mins" on:click={click}>
        <Component is={presenter.presenter} props={{ value: doc, withoutSpace }} />
      </div>
    {:else}
      <Component is={presenter.presenter} props={{ value: doc, withoutSpace }} on:click={click}>
        <slot />
      </Component>
    {/if}
  {:else}
    <DocReferencePresenter value={doc} on:click={click}>
      <slot />
    </DocReferencePresenter>
  {/if}
{/if}
