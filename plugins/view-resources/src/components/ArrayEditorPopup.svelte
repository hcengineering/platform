<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ObjectPopup } from '@hcengineering/presentation'

  export let _class: Ref<Class<Doc>>
  export let selectedObjects: Ref<Doc>[] = []
  export let placeholder: IntlString
  export let space: Ref<Space>
  export let isSingleSelect = false
  export let ignoreObjects: Ref<Doc>[] = []

  const dispatch = createEventDispatcher()

  async function onUpdate ({ detail }: CustomEvent<Ref<Doc>[] | null | undefined>) {
    dispatch('update', detail)
  }
</script>

<ObjectPopup
  {_class}
  {selectedObjects}
  {placeholder}
  {ignoreObjects}
  multiSelect={!isSingleSelect}
  on:close
  on:update={onUpdate}
  on:changeContent
>
  <svelte:fragment slot="item" let:item>
    <div class="flex flex-grow overflow-label" class:mt-2={'medium'} class:mb-2={'medium'}>
      <span>
        {item.name ?? item.label}
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
