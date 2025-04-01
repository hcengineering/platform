import type { Class, Doc, Domain, Ref } from '@hcengineering/core'

export enum QueueWorkspaceEvent {
  Up = 'up',
  Down = 'down',
  Created = 'created',
  CreateFailed = 'create-failed',
  Upgraded = 'upgraded',
  Upgradefailed = 'upgrade-failed',
  Deleted = 'deleted',
  Archived = 'archived',
  Restored = 'restored',
  FullReindex = 'full-fulltext-reindex',
  Reindex = 'fulltext-reindex',
  ClearIndex = 'clear-fulltext-index'
}

export interface QueueWorkspaceMessage {
  type: QueueWorkspaceEvent
}

export interface QueueWorkspaceReindexMessage extends QueueWorkspaceMessage {
  type: QueueWorkspaceEvent.Reindex

  domain: Domain
  classes: Ref<Class<Doc>>[]
}

export const workspaceEvents = {
  open: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Up }),
  down: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Down }),
  created: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Created }),
  upgraded: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Upgraded }),
  upgradeFailed: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Upgradefailed }),
  createFailed: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.CreateFailed }),
  deleted: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Deleted }),
  archived: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Archived }),
  restored: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.Restored }),
  fullReindex: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.FullReindex }),
  clearIndex: (): QueueWorkspaceMessage => ({ type: QueueWorkspaceEvent.ClearIndex }),
  reindex: (domain: Domain, classes: Ref<Class<Doc>>[]): QueueWorkspaceReindexMessage => ({
    type: QueueWorkspaceEvent.Reindex,
    domain,
    classes
  })
}
