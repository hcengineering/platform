<script lang="ts">
  import { getContext, onDestroy } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { type Doc } from '@hcengineering/core'
  import { CollaborationIds, type Ydoc } from '@hcengineering/text-editor'
  import {
    CollaborationDiffViewer,
    Provider,
    StringDiffViewer,
    createTiptapCollaborationData
  } from '@hcengineering/text-editor-resources'
  import { Dropdown, Label, ListItem, Loading, Scroller, themeStore } from '@hcengineering/ui'
  import documents, {
    ControlledDocument,
    ControlledDocumentSnapshot,
    ControlledDocumentState,
    Document,
    DocumentState
  } from '@hcengineering/controlled-documents'
  import plugin from '../../plugin'
  import {
    $controlledDocument as controlledDocument,
    $comparedDocument as compareTo,
    $documentComparisonVersions as documentComparisonVersions,
    comparisonRequested
  } from '../../stores/editors/document'
  import { getTranslatedControlledDocStates, getTranslatedDocumentStates } from '../../utils'
  import DocumentTitle from './DocumentTitle.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const ydoc = getContext<Ydoc>(CollaborationIds.Doc)

  let comparedYdoc: Ydoc | undefined = undefined
  let comparedProvider: Provider | undefined = undefined
  let loading = true

  const handleSelect = (event: CustomEvent<ListItem>) => {
    const version = $documentComparisonVersions.find((item) => item._id === event.detail._id)
    if (version) {
      comparisonRequested(version)
    }
  }

  let translatedStates: Readonly<Record<DocumentState | ControlledDocumentState, string>> | null = null
  function getTranslatedLabels (lang: string) {
    Promise.all([getTranslatedDocumentStates(lang), getTranslatedControlledDocStates(lang)]).then(
      ([states, controlledStates]) => {
        translatedStates = {
          ...states,
          ...controlledStates
        }
      }
    )
  }

  function isDocument (document: Doc | null): document is Document {
    if (document == null) {
      return false
    }

    return hierarchy.isDerived(document._class, documents.class.Document)
  }

  const generateVersionName = (
    document: ControlledDocument | ControlledDocumentSnapshot,
    translatedStates: Readonly<Record<DocumentState | ControlledDocumentState, string>> | null
  ): string => {
    let state: ControlledDocumentState | DocumentState | undefined = document.controlledState
    if (state == null) {
      state = document.state ?? DocumentState.Draft
    }

    if (isDocument(document)) {
      return `v${document.major}.${document.minor} | ${translatedStates ? translatedStates[state] : ''}`
    } else {
      return `${document.name} | ${translatedStates ? translatedStates[state] : ''}`
    }
  }

  $: getTranslatedLabels($themeStore.language)
  $: versionItems = $documentComparisonVersions.map((version) => ({
    _id: version._id,
    label: generateVersionName(version, translatedStates)
  }))
  $: if ($compareTo) {
    if (comparedProvider) {
      comparedProvider.destroy()
    }
    loading = true

    const data = createTiptapCollaborationData({
      document: $compareTo.content
    })
    comparedYdoc = data.ydoc
    comparedProvider = data.provider
    void comparedProvider.loaded.then(() => (loading = false))
  }

  onDestroy(() => {
    void comparedProvider?.destroy()
  })
</script>

<div class="flex flex-gap-2 h-12 pl-7 items-center bottom-divider">
  <Label label={plugin.string.Compare} />
  <Dropdown
    items={versionItems}
    disabled
    selected={versionItems.find((item) => item._id === $controlledDocument?._id)}
    withSearch={false}
    placeholder={documents.string.Version}
  />
  <Label label={plugin.string.Against} />
  <Dropdown
    items={versionItems}
    selected={versionItems.find((item) => item._id === $compareTo?._id)}
    withSearch={false}
    placeholder={documents.string.Version}
    on:selected={handleSelect}
  />
</div>
{#if loading}
  <Loading />
{:else}
  <Scroller>
    <div class="root">
      <DocumentTitle>
        <StringDiffViewer
          value={$controlledDocument?.title ?? ''}
          compareTo={(isDocument($compareTo) ? $compareTo : $controlledDocument)?.title ?? ''}
        />
      </DocumentTitle>
      <CollaborationDiffViewer field="content" comparedField="content" {ydoc} {comparedYdoc} />
      <div class="bottomSpacing" />
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .root {
    padding: 0 3.25rem;
  }

  .bottomSpacing {
    padding-bottom: 30vh;
  }
</style>
