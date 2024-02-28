<script lang="ts">
  import { Class, Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, navigate } from '@hcengineering/ui'
  import view, { ObjectPanel } from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { ItemPresenter, ToDo } from '@hcengineering/time'
  import time from '../plugin'

  export let todo: ToDo
  export let kind: 'default' | 'todo-line' = 'default'
  export let size: 'small' | 'large' = 'small'
  export let withoutSpace: boolean = false
  export let isEditable: boolean = false
  export let shouldShowAvatar: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: presenter = hierarchy.classHierarchyMixin<Doc, ItemPresenter>(todo.attachedToClass, time.mixin.ItemPresenter)

  let doc: Doc | undefined = undefined
  const docQuery = createQuery()
  $: docQuery.query(todo.attachedToClass, { _id: todo.attachedTo }, (res) => {
    doc = res[0]
  })

  async function click (ev: MouseEvent) {
    ev.stopPropagation()
    if (!doc) return
    const panelComponent = hierarchy.classHierarchyMixin<Class<Doc>, ObjectPanel>(doc._class, view.mixin.ObjectPanel)
    const component = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, doc, {}, component)
    navigate(loc)
  }
</script>

{#if presenter?.presenter && doc}
  {#if kind === 'default'}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="cursor-pointer clear-mins" on:click|stopPropagation={click}>
      <Component is={presenter.presenter} props={{ value: doc, withoutSpace, isEditable, shouldShowAvatar }} />
    </div>
  {:else}
    <Component
      is={presenter.presenter}
      props={{ value: doc, withoutSpace, isEditable, kind: size === 'large' ? 'todo-line-large' : 'todo-line' }}
      on:click={click}
    >
      <slot />
    </Component>
  {/if}
{/if}
