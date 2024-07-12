<script lang="ts">
  import { DocumentTemplateSection } from '@hcengineering/controlled-documents'
  import { Card } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
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
  okLabel={textEditor.string.Save}
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
      placeholder={textEditor.string.EditorPlaceholder}
      alwaysEdit={true}
    />
  </div>
</Card>
