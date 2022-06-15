<script lang="ts">
  import { Class, Doc, Ref } from '@anticrm/core'
  import { EditorViewMode, KeyedAttribute } from '@anticrm/presentation'

  import Tags from './Tags.svelte'
  import TagsAttributeEditor from './TagsAttributeEditor.svelte'

  export let object: Doc
  export let isEditable: boolean = true
  export let _class: Ref<Class<Doc>>
  export let key: KeyedAttribute
  export let mode: EditorViewMode | undefined = undefined
</script>

{#if mode === EditorViewMode.Attribute}
  <TagsAttributeEditor {object} {isEditable} />
{:else}
  <Tags {_class} {object} {key} />
{/if}
