<script lang="ts">
  import { WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { themeStore } from '@hcengineering/ui'
  import {
    ControlledDocument,
    ControlledDocumentState,
    Document,
    DocumentState,
    isControlledDocument
  } from '@hcengineering/controlled-documents'

  import DocumentStatusTag from '../common/DocumentStatusTag.svelte'
  import {
    statesTags,
    controlledStatesTags,
    DocumentStateTagType,
    TranslatedControlledDocStates,
    TranslatedDocumentStates,
    getTranslatedControlledDocStates,
    getTranslatedDocumentStates
  } from '../../../utils'

  export let value: WithLookup<Document> | WithLookup<ControlledDocument> | ControlledDocumentState | DocumentState
  export let showTag = true

  const client = getClient()

  let docStates: TranslatedDocumentStates | undefined
  let controlledDocStates: TranslatedControlledDocStates | undefined

  async function getTranslatedLabels (lang: string) {
    docStates = await getTranslatedDocumentStates(lang)
    controlledDocStates = await getTranslatedControlledDocStates(lang)
  }

  $: getTranslatedLabels($themeStore.language)

  let text: string = ''
  let type: DocumentStateTagType

  $: if (docStates && controlledDocStates) {
    if (typeof value === 'string') {
      text = controlledDocStates[value as ControlledDocumentState] || docStates[value as DocumentState]
      type = controlledStatesTags[value as ControlledDocumentState] || statesTags[value as DocumentState]
    } else if (isControlledDocument(client, value) && value.controlledState != null) {
      text = controlledDocStates[value.controlledState]
      type = controlledStatesTags[value.controlledState]
    } else {
      text = docStates[value.state]
      type = statesTags[value.state]
    }
  }
</script>

{#if docStates !== undefined && controlledDocStates !== undefined}
  {#if showTag}
    <DocumentStatusTag {type}>{text}</DocumentStatusTag>
  {:else}
    {text}
  {/if}
{/if}
