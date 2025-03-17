import { attach, sample } from 'effector'
import { type Ref } from '@hcengineering/core'
import { type ChatMessage } from '@hcengineering/chunter'
import { type EditorMode, DocumentState } from '@hcengineering/controlled-documents'
import { isDocumentCommentAttachedTo } from '../../utils'
import {
  RightPanelTab,
  documentCommentsDisplayRequested,
  documentCommentsHighlightCleared,
  documentCommentsNavigateRequested,
  comparisonCleared,
  comparisonRequested,
  editorModeUpdated
} from './document/actions'
import {
  $documentCommentNavigateTo,
  $documentComments,
  addCommentFx,
  showDocumentCommentsPopupFx,
  resolveCommentFx,
  $documentCommentHighlightedLocation
} from './document/documentComments'
import {
  $activeRightPanelTab,
  $controlledDocument,
  $documentComparisonVersions,
  $availableEditorModes,
  $editorMode
} from './document/editor'

/**
 * Need to export everything from one point to make sure everything is applied (e.g. query.ts will not be imported anywhere)
 */

export * from './document/actions'
export * from './document/canCreateNewDraft'
export * from './document/canRestoreDraft'
export * from './document/canCreateNewSnapshot'
export * from './document/canSendForApproval'
export * from './document/canSendForReview'
export * from './document/documentComments'
export * from './document/comparison'
export * from './document/editor'
export * from './document/query'

export const addDocumentCommentFx = attach({
  source: { document: $controlledDocument },
  effect: addCommentFx,
  mapParams: (
    payload: {
      nodeId?: string
      content: string
      messageId?: Ref<ChatMessage>
    },
    src
  ) => ({
    ...payload,
    ...src
  })
})

sample({
  clock: editorModeUpdated,
  filter: (mode: EditorMode) => mode !== 'comparing',
  target: comparisonCleared
})

sample({
  clock: editorModeUpdated,
  source: { currentDocument: $controlledDocument, documentVersions: $documentComparisonVersions },
  filter: ({ currentDocument }, mode) => mode === 'comparing' && currentDocument !== null,
  fn: ({ currentDocument, documentVersions }) => {
    const previousVersion = documentVersions.find((doc) => doc._id !== currentDocument?._id)

    return (
      documentVersions.find((doc) => doc._id !== currentDocument?._id && doc.state === DocumentState.Effective) ??
      previousVersion ??
      currentDocument! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    )
  },
  target: comparisonRequested
})

sample({
  clock: documentCommentsDisplayRequested,
  source: {
    activeTab: $activeRightPanelTab,
    documentComments: $documentComments,
    navigatedTo: $documentCommentNavigateTo
  },
  filter: ({ activeTab }) => activeTab === RightPanelTab.COMMENT,
  fn: ({ documentComments, navigatedTo }, location) => {
    const filteredDocumentComments = documentComments.filter((item) => isDocumentCommentAttachedTo(item, location))
    let value = filteredDocumentComments.length > 0 ? filteredDocumentComments[0] : null
    if (
      navigatedTo !== null &&
      isDocumentCommentAttachedTo(navigatedTo, location) &&
      filteredDocumentComments.length > 1
    ) {
      // navigate to the next item from the same location
      const lastIndex = filteredDocumentComments.findIndex((item) => item._id === navigatedTo._id)
      const index = (lastIndex + 1) % filteredDocumentComments.length
      value = filteredDocumentComments[index]
    }

    return { value }
  },
  target: documentCommentsNavigateRequested
})

sample({
  clock: documentCommentsDisplayRequested,
  source: { activeTab: $activeRightPanelTab },
  filter: ({ activeTab }) => activeTab !== RightPanelTab.COMMENT,
  fn: (_, clockData) => {
    return {
      ...clockData
    }
  },
  target: showDocumentCommentsPopupFx
})

sample({
  clock: resolveCommentFx.doneData,
  source: { highlighted: $documentCommentHighlightedLocation },
  filter: ({ highlighted }, comment) =>
    highlighted !== null && comment?.resolved === true && isDocumentCommentAttachedTo(comment, highlighted),
  target: documentCommentsHighlightCleared
})

sample({
  clock: $availableEditorModes,
  source: $editorMode,
  filter: (activeMode, modes) => modes.findIndex((mode) => mode.id === activeMode) < 0,
  fn: (_, modes) => modes[0].id,
  target: editorModeUpdated
})
