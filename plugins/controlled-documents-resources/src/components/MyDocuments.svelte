<script lang="ts">
  import { Document } from '@hcengineering/controlled-documents'
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { DocumentQuery, Ref, getCurrentAccount } from '@hcengineering/core'
  import DocumentsContainer from './DocumentsContainer.svelte'

  import documents from '../plugin'
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  export let query: DocumentQuery<Document> = {}
  export let config: [string, IntlString, object][] = []

  const dispatch = createEventDispatcher()
  const currentEmployee = (getCurrentAccount() as PersonAccount).person as Ref<Employee>

  $: resultQuery = {
    ...query,
    owner: currentEmployee
  }
</script>

<DocumentsContainer
  query={resultQuery}
  icon={documents.icon.Document}
  title={documents.string.MyDocuments}
  {config}
  on:action={(event) => dispatch('action', event.detail)}
/>
