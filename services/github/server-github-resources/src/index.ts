//
// Copyright © 2023 Hardcore Engineering Inc.
//

import chunter from '@hcengineering/chunter'
import core, {
  Doc,
  DocumentUpdate,
  Hierarchy,
  Ref,
  Space,
  Storage,
  Tx,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  systemAccountUuid,
  type Class,
  type TxMixin
} from '@hcengineering/core'
import github, { DocSyncInfo, GithubProject } from '@hcengineering/github'
import { TriggerControl } from '@hcengineering/server-core'
import time, { ToDo } from '@hcengineering/time'
import tracker from '@hcengineering/tracker'

/**
 * @public
 */
export async function OnProjectChanges (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  const cache = new Map<string, any>()

  const toApply: Tx[] = []
  for (const ltx of txes) {
    if (ltx._class === core.class.TxMixin && (ltx as TxMixin<Doc, Doc>).mixin === github.mixin.GithubIssue) {
      const mix = ltx as TxMixin<Doc, Doc>
      // Do not spend time to wait for trigger processing
      await updateDocSyncInfo(control, ltx, mix.objectSpace, mix, cache, toApply)
      continue
    }

    if (TxProcessor.isExtendsCUD(ltx._class)) {
      const cud = ltx as TxCUD<Doc>

      let space: Ref<Space> = cud.objectSpace

      if (cud._class === core.class.TxUpdateDoc) {
        const upd = cud as TxUpdateDoc<Doc>
        if (upd.operations.space != null) {
          space = upd.operations.space
        }
      }

      if (isDocSyncUpdateRequired(control.hierarchy, cud)) {
        await updateDocSyncInfo(control, ltx, space, cud, cache, toApply)
      }
      if (control.hierarchy.isDerived(cud.objectClass, time.class.ToDo)) {
        if (cud.attachedToClass !== undefined && cud.attachedTo !== undefined) {
          if (control.hierarchy.isDerived(cud.attachedToClass, github.class.GithubPullRequest)) {
            // Ok we got todo change for pull request, let's mark it for sync.
            result.push(
              control.txFactory.createTxUpdateDoc<DocSyncInfo>(
                github.class.DocSyncInfo,
                ltx.objectSpace,
                cud.attachedTo as Ref<DocSyncInfo>,
                {
                  needSync: ''
                }
              )
            )
          }
        }
      }
    }
  }
  if (toApply.length > 0) {
    await control.apply(control.ctx, toApply)
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnProjectChanges
  },
  functions: {
    TodoDoneTester
  }
})

async function TodoDoneTester (
  client: {
    findAll: Storage['findAll']
    hierarchy: Hierarchy
  },
  todo: ToDo
): Promise<boolean> {
  if (client.hierarchy.hasMixin(todo, github.mixin.GithubTodo)) {
    return false
  }
  return true
}

async function updateDocSyncInfo (
  control: TriggerControl,
  tx: Tx,
  space: Ref<Space>,
  cud: {
    _class: Ref<Class<Tx>>
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  },
  cache: Map<string, any>,
  toApply: Tx[]
): Promise<void> {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const checkTx = (tx: Tx): boolean =>
  //   control.hierarchy.isDerived(tx._class, core.class.TxCUD) &&
  //   (tx as TxCUD<Doc>).objectClass === github.class.DocSyncInfo &&
  //   (tx as TxCUD<Doc>).objectId === cud.objectId

  // const txes = [...control.txes, ...control.ctx.contextData.broadcast.txes, ...toApply]
  // // Check already captured Txes
  // for (const i of txes) {
  //   if (checkTx(i)) {
  //     // We have sync doc create request already.
  //     return
  //   }
  // }

  // const [account] = control.modelDb.findAllSync(contact.class.PersonAccount, {
  //   _id: tx.modifiedBy as PersonId
  // })
  // // Do not modify state if is modified by github service.
  // if (account === undefined) {
  //   return
  // }
  // const projects =
  //   (cache.get('projects') as GithubProject[]) ??
  //   (await control.queryFind(control.ctx, github.mixin.GithubProject, {}, { projection: { _id: 1 } }))
  // cache.set('projects', projects)

  // if (projects.some((it) => it._id === (space as Ref<GithubProject>))) {
  //   const sdoc =
  //     (cache.get(cud.objectId) as DocSyncInfo) ??
  //     (
  //       await control.findAll(control.ctx, github.class.DocSyncInfo, {
  //         _id: cud.objectId as Ref<DocSyncInfo>
  //       })
  //     ).shift()

  //   // We need to check if sync doc is already exists.
  //   if (sdoc === undefined) {
  //     // Created by non github integration
  //     // We need to create the doc sync info
  //     createSyncDoc(control, cud, tx, space, toApply)
  //   } else {
  //     cache.set(cud.objectId, sdoc)
  //     // We need to create the doc sync info
  //     updateSyncDoc(control, cud, space, sdoc, toApply)
  //   }
  // }
}

function isDocSyncUpdateRequired (h: Hierarchy, coll: TxCUD<Doc>): boolean {
  return (
    h.isDerived(coll.objectClass, tracker.class.Issue) ||
    h.isDerived(coll.objectClass, chunter.class.ChatMessage) ||
    h.isDerived(coll.objectClass, github.class.GithubReviewComment) ||
    h.isDerived(coll.objectClass, github.class.GithubReview) ||
    h.isDerived(coll.objectClass, github.class.GithubReviewThread) ||
    h.isDerived(coll.objectClass, tracker.class.Milestone)
  )
}

function updateSyncDoc (
  control: TriggerControl,
  cud: {
    _class: Ref<Class<Tx>>
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  },
  space: Ref<Space>,
  info: DocSyncInfo,
  toApply: Tx[]
): void {
  const data: DocumentUpdate<DocSyncInfo> =
    cud._class === core.class.TxRemoveDoc
      ? {
          needSync: '',
          deleted: true
        }
      : {
          needSync: ''
        }
  if (info.space !== space) {
    data.externalVersion = '#' // We need to put this one to handle new documents.)
    data.space = space
  }
  toApply.push(
    control.txFactory.createTxUpdateDoc<DocSyncInfo>(
      github.class.DocSyncInfo,
      info.space,
      cud.objectId as Ref<DocSyncInfo>,
      data
    )
  )

  control.ctx.contextData.broadcast.targets.github = (it) => {
    if (control.hierarchy.isDerived(it._class, core.class.TxCUD)) {
      if ((it as TxCUD<Doc>).objectClass === github.class.DocSyncInfo) {
        return [systemAccountUuid]
      }
    }
  }
}

function createSyncDoc (
  control: TriggerControl,
  cud: {
    _class: Ref<Class<Tx>>
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  },
  tx: Tx,
  space: Ref<Space>,
  toApply: Tx[]
): void {
  const data: DocumentUpdate<DocSyncInfo> = {
    url: '',
    githubNumber: 0,
    repository: null,
    objectClass: cud.objectClass,
    externalVersion: '#', // We need to put this one to handle new documents.
    needSync: '',
    derivedVersion: ''
  }
  if ((tx as TxCUD<Doc>).attachedTo !== undefined) {
    // Collection CUD, we could assign attachedTo
    data.attachedTo = (tx as TxCUD<Doc>).attachedTo
  }

  toApply.push(
    control.txFactory.createTxCreateDoc<DocSyncInfo>(
      github.class.DocSyncInfo,
      space,
      data,
      cud.objectId as Ref<DocSyncInfo>
    )
  )
  control.ctx.contextData.broadcast.targets.github = (it) => {
    if (control.hierarchy.isDerived(it._class, core.class.TxCUD)) {
      if ((it as TxCUD<Doc>).objectClass === github.class.DocSyncInfo) {
        return [systemAccountUuid]
      }
    }
  }
}
