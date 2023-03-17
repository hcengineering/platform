<script lang="ts">
  import { Class, Data, Doc, Ref } from '@hcengineering/core'
  import { InlineAttributeBarEditor } from '..'
  import { KeyedAttribute } from '../attributes'
  import { getClient, getFiltredKeys, isCollectionAttr } from '../utils'

  export let object: Doc | Data<Doc>
  export let _class: Ref<Class<Doc>>
  export let toClass: Ref<Class<Doc>> | undefined = undefined
  export let ignoreKeys: string[] = []
  export let extraKeys: string[] = []
  export let extraProps: Record<string, any> = {}

  let keys: KeyedAttribute[]

  const client = getClient()

  function updateKeys (_class: Ref<Class<Doc>>, ignoreKeys: string[], to: Ref<Class<Doc>> | undefined): void {
    const filtredKeys = getFiltredKeys(client.getHierarchy(), _class, ignoreKeys, to)
    keys = filtredKeys.filter(
      (key) => (extraKeys.includes(key.key) || !isCollectionAttr(client.getHierarchy(), key)) && !key.attr.readonly
    )
  }

  $: updateKeys(_class, ignoreKeys, toClass)
</script>

{#each keys as key (typeof key === 'string' ? key : key.key)}
  <InlineAttributeBarEditor {key} {_class} {object} readonly={false} draft={true} on:update {extraProps} />
{/each}
