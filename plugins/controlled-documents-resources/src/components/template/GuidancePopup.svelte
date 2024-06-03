<script lang="ts">
  import { DocumentTemplateSection } from '@hcengineering/controlled-documents'
  import { Card } from '@hcengineering/presentation'
  import editor, { StyledTextBox } from '@hcengineering/text-editor'
  import { createEventDispatcher } from 'svelte'
  import document from '../../plugin'

  export let section: DocumentTemplateSection
  // const client = getClient()
  // const attrContext = client.getHierarchy().getAttribute(document.class.ContentSection, 'guidance')
  const dispatch = createEventDispatcher()

  let updatedValue = section.guidance ?? ''
</script>

<Card
  label={document.string.Guidance}
  okLabel={editor.string.Save}
  okAction={() => {
    // updateAttribute(
    //   client,
    //   section,
    //   document.class.ContentSection,
    //   { key: 'guidance', attr: attrContext },
    //   updatedValue
    // )
  }}
  canSave={updatedValue !== (section.guidance ?? '')}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="mt-4">
    <StyledTextBox
      bind:content={updatedValue}
      showButtons={true}
      placeholder={editor.string.EditorPlaceholder}
      alwaysEdit={true}
    />
  </div>
</Card>
