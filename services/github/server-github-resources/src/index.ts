//
// Copyright © 2023 Hardcore Engineering Inc.
//

import chunter from '@hcengineering/chunter'
import contact, { PersonAccount } from '@hcengineering/contact'
import core, {
  AttachedDoc,
  Doc,
  DocumentUpdate,
  Hierarchy,
  Ref,
  Space,
  Storage,
  Tx,
  TxCUD,
  TxCollectionCUD,
  TxProcessor,
  TxUpdateDoc,
  systemAccountEmail,
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
export async function OnProjectChanges (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ltx = TxProcessor.extractTx(tx)

  if (ltx._class === core.class.TxMixin && (ltx as TxMixin<Doc, Doc>).mixin === github.mixin.GithubIssue) {
    const mix = ltx as TxMixin<Doc, Doc>
    // Do not spend time to wait for trigger processing
    await updateDocSyncInfo(control, tx, mix.objectSpace, mix)
    return []
  }

  if (control.hierarchy.isDerived(ltx._class, core.class.TxCUD)) {
    const cud = ltx as TxCUD<Doc>

    let space: Ref<Space> = cud.objectSpace

    if (cud._class === core.class.TxUpdateDoc) {
      const upd = cud as TxUpdateDoc<Doc>
      if (upd.operations.space != null) {
        space = upd.operations.space
      }
    }

    if (isDocSyncUpdateRequired(control.hierarchy, cud)) {
      // Do not spend time to wait for trigger processing
      await updateDocSyncInfo(control, tx, space, cud)
    }
    if (control.hierarchy.isDerived(cud.objectClass, time.class.ToDo)) {
      if (tx._class === core.class.TxCollectionCUD) {
        const coll = tx as TxCollectionCUD<Doc, AttachedDoc>
        if (control.hierarchy.isDerived(coll.objectClass, github.class.GithubPullRequest)) {
          // Ok we got todo change for pull request, let's mark it for sync.
          return [
            control.txFactory.createTxUpdateDoc<DocSyncInfo>(
              github.class.DocSyncInfo,
              coll.objectSpace,
              coll.objectId as Ref<DocSyncInfo>,
              {
                needSync: ''
              }
            )
          ]
        }
      }
    }
  }
  return []
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
  }
): Promise<void> {
  const checkTx = (tx: Tx): boolean =>
    control.hierarchy.isDerived(tx._class, core.class.TxCUD) &&
    (tx as TxCUD<Doc>).objectClass === github.class.DocSyncInfo &&
    (tx as TxCUD<Doc>).objectId === cud.objectId

  const txes = [...control.txes, ...control.ctx.contextData.broadcast.txes]
  // Check already captured Txes
  for (const i of txes) {
    if (checkTx(i)) {
      // We have sync doc create request already.
      return
    }
  }

  const [account] = control.modelDb.findAllSync(contact.class.PersonAccount, {
    _id: tx.modifiedBy as Ref<PersonAccount>
  })
  // Do not modify state if is modified by github service.
  if (account === undefined) {
    return
  }

  const projects = await control.queryFind(control.ctx, github.mixin.GithubProject, {}, { projection: { _id: 1 } })
  if (projects.some((it) => it._id === (space as Ref<GithubProject>))) {
    const [sdoc] = await control.findAll(control.ctx, github.class.DocSyncInfo, {
      _id: cud.objectId as Ref<DocSyncInfo>
    })
    // We need to check if sync doc is already exists.
    if (sdoc === undefined) {
      // Created by non github integration
      // We need to create the doc sync info
      await createSyncDoc(control, cud, tx, space)
    } else {
      // We need to create the doc sync info
      await updateSyncDoc(control, cud, space, sdoc)
    }
  }
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

async function updateSyncDoc (
  control: TriggerControl,
  cud: {
    _class: Ref<Class<Tx>>
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  },
  space: Ref<Space>,
  info: DocSyncInfo
): Promise<void> {
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
  await control.apply(control.ctx, [
    control.txFactory.createTxUpdateDoc<DocSyncInfo>(
      github.class.DocSyncInfo,
      info.space,
      cud.objectId as Ref<DocSyncInfo>,
      data
    )
  ])

  control.ctx.contextData.broadcast.targets.github = (it) => {
    if (control.hierarchy.isDerived(it._class, core.class.TxCUD)) {
      if ((it as TxCUD<Doc>).objectClass === github.class.DocSyncInfo) {
        return [systemAccountEmail]
      }
    }
  }
}

async function createSyncDoc (
  control: TriggerControl,
  cud: {
    _class: Ref<Class<Tx>>
    objectId: Ref<Doc>
    objectClass: Ref<Class<Doc>>
  },
  tx: Tx,
  space: Ref<Space>
): Promise<void> {
  const data: DocumentUpdate<DocSyncInfo> = {
    url: '',
    githubNumber: 0,
    repository: null,
    objectClass: cud.objectClass,
    externalVersion: '#', // We need to put this one to handle new documents.
    needSync: '',
    derivedVersion: ''
  }
  if (tx._class === core.class.TxCollectionCUD) {
    const coll = tx as TxCollectionCUD<Doc, AttachedDoc>
    // Collection CUD, we could assign attachedTo
    data.attachedTo = coll.objectId
  }

  await control.apply(control.ctx, [
    control.txFactory.createTxCreateDoc<DocSyncInfo>(
      github.class.DocSyncInfo,
      space,
      data,
      cud.objectId as Ref<DocSyncInfo>
    )
  ])
  control.ctx.contextData.broadcast.targets.github = (it) => {
    if (control.hierarchy.isDerived(it._class, core.class.TxCUD)) {
      if ((it as TxCUD<Doc>).objectClass === github.class.DocSyncInfo) {
        return [systemAccountEmail]
      }
    }
  }
}
