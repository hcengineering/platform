/* eslint-disable @typescript-eslint/unbound-method */
import { type Branding, type MeasureContext, type WorkspaceId } from '@hcengineering/core'
import { CollaborativeContentRetrievalStage } from '@hcengineering/server-collaboration'
import {
  type ContentTextAdapter,
  type FullTextAdapter,
  type SessionFindAll,
  type StorageAdapter
} from '@hcengineering/server-core'

import {
  ContentRetrievalStage,
  FullSummaryStage,
  FullTextPushStage,
  IndexedFieldStage,
  globalIndexer,
  type FullTextPipelineStage
} from '@hcengineering/server-indexer'

export function createIndexStages (
  fullText: MeasureContext,
  workspace: WorkspaceId,
  branding: Branding | null,
  adapter: FullTextAdapter,
  storageFindAll: SessionFindAll,
  storageAdapter: StorageAdapter,
  contentAdapter: ContentTextAdapter,
  indexParallel: number,
  indexProcessing: number
): FullTextPipelineStage[] {
  // Allow 2 workspaces to be indexed in parallel
  globalIndexer.allowParallel = indexParallel
  globalIndexer.processingSize = indexProcessing

  const stages: FullTextPipelineStage[] = []

  // Add regular stage to for indexable fields change tracking.
  stages.push(new IndexedFieldStage(storageFindAll))

  // Obtain text content from storage(like minio) and use content adapter to convert files to text content.
  stages.push(new ContentRetrievalStage(storageAdapter, workspace, fullText.newChild('content', {}), contentAdapter))

  // Obtain collaborative content
  stages.push(
    new CollaborativeContentRetrievalStage(
      storageAdapter,
      workspace,
      fullText.newChild('collaborative', {}),
      contentAdapter
    )
  )
  // Summary stage
  const summaryStage = new FullSummaryStage(storageFindAll)

  stages.push(summaryStage)

  // Push all content to elastic search
  const pushStage = new FullTextPushStage(storageFindAll, adapter, workspace, branding)
  stages.push(pushStage)

  // // OpenAI prepare stage
  // const openAIStage = new OpenAIEmbeddingsStage(adapter, workspace)
  // // We depend on all available stages.
  // openAIStage.require = stages.map((it) => it.stageId)

  // openAIStage.updateSummary(summaryStage)

  // stages.push(openAIStage)

  return stages
}
