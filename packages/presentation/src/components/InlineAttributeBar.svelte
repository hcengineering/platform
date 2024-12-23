<script lang="ts">
  import { Class, Data, Doc, Hierarchy, Ref } from '@hcengineering/core'
  import { InlineAttributeBarEditor } from '..'
  import { KeyedAttribute } from '../attributes'
  import { getClient, getFiltredKeys, isCollectionAttr, isCollabAttr, isMarkupAttr } from '../utils'

  export let object: Doc | Data<Doc>
  export let _class: Ref<Class<Doc>>
  export let toClass: Ref<Class<Doc>> | undefined = undefined
  export let ignoreKeys: string[] = []
  export let extraKeys: string[] = []
  export let extraProps: Record<string, any> = {}

  let keys: KeyedAttribute[]

  function isInlineAttr (hierarchy: Hierarchy, key: KeyedAttribute): boolean {
    return !isCollectionAttr(hierarchy, key) && !isCollabAttr(hierarchy, key) && !isMarkupAttr(hierarchy, key)
  }

  function updateKeys (_class: Ref<Class<Doc>>, ignoreKeys: string[], to: Ref<Class<Doc>> | undefined): void {
    const hierarchy = getClient().getHierarchy()
    const filtredKeys = getFiltredKeys(hierarchy, _class, ignoreKeys, to)
    keys = filtredKeys.filter(
      (key) => (extraKeys.includes(key.key) || isInlineAttr(hierarchy, key)) && key.attr.readonly !== true
    )
  }

  $: updateKeys(_class, ignoreKeys, toClass)
</script>

{#each keys as key (typeof key === 'string' ? key : key.key)}
  <InlineAttributeBarEditor {key} {_class} {object} readonly={false} draft={true} on:update {extraProps} />
{/each}
