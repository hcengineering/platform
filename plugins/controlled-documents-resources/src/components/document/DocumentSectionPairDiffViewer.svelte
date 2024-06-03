<script lang="ts">
  import { Doc as Ydoc } from 'yjs'
  import { getClient } from '@hcengineering/presentation'
  import { CollaborationDiffViewer, StringDiffViewer } from '@hcengineering/text-editor'
  import documents, { DocumentSection, CollaborativeDocumentSection } from '@hcengineering/controlled-documents'
  import plugin from '../../plugin'
  import { ComparisonSectionPair } from '../../stores/editors/document'
  import FieldSectionEditor from '../FieldSectionEditor.svelte'

  export let pair: ComparisonSectionPair
  export let firstYdoc: Ydoc
  export let secondYdoc: Ydoc | undefined = undefined
  export let expanded = false

  const hierarchy = getClient().getHierarchy()

  const getSectionField = (section: DocumentSection | undefined | null) => {
    if (!section) {
      return ''
    }

    return (section as CollaborativeDocumentSection).collaboratorSectionId
  }
  $: _class = pair[0]?.section._class ?? pair[1]?.section._class
</script>

<FieldSectionEditor {expanded} editable={false} on:toggle>
  <svelte:fragment slot="index">
    <StringDiffViewer value={`${pair[0]?.index ?? ''}`} compareTo={`${pair[1]?.index ?? ''}`} />
  </svelte:fragment>
  <svelte:fragment slot="header">
    <StringDiffViewer value={pair[0]?.section.title ?? ''} compareTo={pair[1]?.section.title ?? ''} />
  </svelte:fragment>
  <svelte:fragment slot="content">
    {#if _class && hierarchy.isDerived(_class, documents.class.CollaborativeDocumentSection)}
      <CollaborationDiffViewer
        field={getSectionField(pair[0]?.section)}
        comparedField={getSectionField(pair[1]?.section)}
        ydoc={firstYdoc}
        comparedYdoc={secondYdoc}
      />
    {:else}
      {plugin.string.ComparisonModeNotSupported}
    {/if}
  </svelte:fragment>
</FieldSectionEditor>
