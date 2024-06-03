<script lang="ts">
  import { getContext, onDestroy } from 'svelte'
  import { Doc as Ydoc } from 'yjs'
  import { getClient } from '@hcengineering/presentation'
  import { type Doc } from '@hcengineering/core'
  import {
    CollaborationIds,
    StringDiffViewer,
    TiptapCollabProvider,
    createTiptapCollaborationData,
    formatCollaborativeDocumentId
  } from '@hcengineering/text-editor'
  import { Dropdown, Label, ListItem, Loading, Scroller, themeStore } from '@hcengineering/ui'
  import documents, {
    ControlledDocument,
    ControlledDocumentSnapshot,
    ControlledDocumentState,
    Document,
    DocumentSection,
    DocumentState
  } from '@hcengineering/controlled-documents'
  import plugin from '../../plugin'
  import {
    $controlledDocument as controlledDocument,
    $controlledDocumentSections as sections,
    $comparedDocument as compareTo,
    $comparedDocumentSections as compareToSections,
    $documentComparisonVersions as documentComparisonVersions,
    ComparisonSectionPair,
    comparisonRequested,
    loadComparedDocumentSectionsFx
  } from '../../stores/editors/document'
  import { COLLABORATOR_URL, TOKEN, getTranslatedControlledDocStates, getTranslatedDocumentStates } from '../../utils'
  import DocumentSectionPairDiffViewer from './DocumentSectionPairDiffViewer.svelte'
  import DocumentTitle from './DocumentTitle.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const ydoc = getContext<Ydoc>(CollaborationIds.Doc)

  let collapsedPairIndices = new Set<number>()
  let comparedYdoc: Ydoc | undefined = undefined
  let comparedProvider: TiptapCollabProvider | undefined = undefined
  let loading = true
  const isLoadPending = loadComparedDocumentSectionsFx.pending

  const handleSectionDiffPairs = (firstSections: DocumentSection[], secondSections: DocumentSection[]) => {
    const result: ComparisonSectionPair[] = []
    const firstSectionKeys = new Set(firstSections.map((section) => section.key))
    const secondSectionKeys = new Set(secondSections.map((section) => section.key))
    let secondIndex = 0
    let firstIndex = 0
    while (firstIndex < firstSections.length) {
      const firstSection = firstSections[firstIndex]
      if (secondSectionKeys.has(firstSection.key)) {
        while (secondIndex < secondSections.length && !firstSectionKeys.has(secondSections[secondIndex].key)) {
          result.push([null, { section: secondSections[secondIndex], index: secondIndex + 1 }])
          secondIndex++
        }
      }
      if (secondIndex < secondSections.length && firstSection.key === secondSections[secondIndex].key) {
        result.push([
          { section: firstSection, index: firstIndex + 1 },
          { section: secondSections[secondIndex], index: secondIndex + 1 }
        ])
        secondIndex++
      } else {
        result.push([{ section: firstSection, index: firstIndex + 1 }, null])
      }
      firstIndex++
    }

    while (secondIndex < secondSections.length) {
      result.push([null, { section: secondSections[secondIndex], index: secondIndex + 1 }])
      secondIndex++
    }

    return result
  }

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
      comparedProvider.disconnect()
    }
    loading = true
    const collaborativeDoc = $compareTo.content

    const data = createTiptapCollaborationData({
      collaboratorURL: COLLABORATOR_URL,
      token: TOKEN,
      documentId: formatCollaborativeDocumentId(collaborativeDoc)
    })
    comparedYdoc = data.ydoc
    comparedProvider = data.provider
    comparedProvider.loaded.then(() => (loading = false))
  }

  $: sectionDiffPairs = handleSectionDiffPairs($sections, $compareToSections)

  onDestroy(() => {
    comparedProvider?.destroy()
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
{#if loading || $isLoadPending}
  <Loading />
{:else}
  <Scroller>
    <div class="antiAccordion">
      <div class="pl-7">
        <DocumentTitle>
          <StringDiffViewer
            value={$controlledDocument?.title ?? ''}
            compareTo={(isDocument($compareTo) ? $compareTo : $controlledDocument)?.title ?? ''}
          />
        </DocumentTitle>
      </div>
      {#each sectionDiffPairs as pair, index}
        <DocumentSectionPairDiffViewer
          {pair}
          firstYdoc={ydoc}
          secondYdoc={comparedYdoc}
          expanded={!collapsedPairIndices.has(index)}
          on:toggle={() => {
            if (collapsedPairIndices.has(index)) {
              collapsedPairIndices.delete(index)
            } else {
              collapsedPairIndices.add(index)
            }
            collapsedPairIndices = new Set(collapsedPairIndices)
          }}
        />
      {/each}
    </div>
  </Scroller>
{/if}
