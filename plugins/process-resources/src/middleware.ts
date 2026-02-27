// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import cardPlugin, { type Card } from '@hcengineering/card'
import core, {
  generateId,
  getCurrentAccount,
  SortingOrder,
  TxOperations,
  TxProcessor,
  type Client,
  type Doc,
  type Tx,
  type TxApplyIf,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  type TxResult,
  type TxUpdateDoc
} from '@hcengineering/core'
import { BasePresentationMiddleware, type PresentationMiddleware } from '@hcengineering/presentation'
import { type ApproveRequest, ExecutionStatus, isUpdateTx, type ProcessToDo } from '@hcengineering/process'
import process from './plugin'
import { createExecution, getNextStateUserInput, pickTransition, requestResult } from './utils'

/**
 * @public
 */
export class ProcessMiddleware extends BasePresentationMiddleware implements PresentationMiddleware {
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
  }

  async notifyTx (...tx: Tx[]): Promise<void> {
    await this.provideNotifyTx(...tx)
  }

  async close (): Promise<void> {
    await this.provideClose()
  }

  static create (client: Client, next?: PresentationMiddleware): ProcessMiddleware {
    return new ProcessMiddleware(client, next)
  }

  private readonly txFactory = new TxOperations(this.client, getCurrentAccount().primarySocialId).txFactory

  async tx (tx: Tx): Promise<TxResult> {
    const preTx: Array<TxCUD<Doc>> = []
    const postTx: Array<TxCUD<Doc>> = []
    await this.handleTx(preTx, postTx, tx)

    if (preTx.length > 0 || postTx.length > 0) {
      if (TxProcessor.isExtendsCUD(tx._class)) {
        const applyIf = this.txFactory.createTxApplyIf(
          core.space.Tx,
          generateId(),
          [],
          [],
          [...preTx, tx as TxCUD<Doc>, ...postTx],
          'process',
          true
        )
        return await this.provideTx(applyIf)
      }
    }

    return await this.provideTx(tx)
  }

  private async handleTx (preTx: Array<TxCUD<Doc>>, postTx: Array<TxCUD<Doc>>, ...txes: Tx[]): Promise<void> {
    for (const etx of txes) {
      if (etx._class === core.class.TxApplyIf) {
        const applyIf = etx as TxApplyIf
        await this.handleTx(preTx, postTx, ...applyIf.txes)
      }

      await this.handleCardCreate(postTx, etx)
      await this.handleCardUpdate(preTx, etx)
      await this.handleTagAdd(postTx, etx)
      await this.handleToDoDone(preTx, etx)
      await this.handleApproveRequest(preTx, etx)
    }
  }

  private async handleCardUpdate (preTx: Array<TxCUD<Doc>>, etx: Tx): Promise<void> {
    if (etx._class === core.class.TxUpdateDoc || etx._class === core.class.TxMixin) {
      const updateTx = etx as TxUpdateDoc<Card> | TxMixin<Card, Card>
      const hierarchy = this.client.getHierarchy()
      if (!hierarchy.isDerived(updateTx.objectClass, cardPlugin.class.Card)) return
      const executions = await this.client.findAll(process.class.Execution, {
        card: updateTx.objectId,
        status: ExecutionStatus.Active
      })
      if (executions.length === 0) return
      const card = await this.client.findOne(cardPlugin.class.Card, {
        _id: updateTx.objectId
      })
      if (card === undefined) return
      const updated = isUpdateTx(updateTx)
        ? TxProcessor.updateDoc2Doc<Card>(hierarchy.clone(card), updateTx)
        : TxProcessor.updateMixin4Doc<Card, Card>(hierarchy.clone(card), updateTx)
      for (const execution of executions) {
        const transitions = this.client.getModel().findAllSync(
          process.class.Transition,
          {
            process: execution.process,
            from: execution.currentState,
            trigger: { $in: [process.trigger.OnCardUpdate, process.trigger.WhenFieldChanges] }
          },
          { sort: { rank: SortingOrder.Ascending } }
        )
        const inputContext = {
          ...execution.context,
          card: updated,
          operations: isUpdateTx(updateTx) ? updateTx.operations : updateTx.attributes
        }
        const transition = await pickTransition(this.client, execution, transitions, inputContext)
        if (transition === undefined) return
        const result = await getNextStateUserInput(execution, transition, execution.context, inputContext)
        if (result?.changed === true) {
          preTx.push(
            this.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
              context: result.context
            })
          )
        }
      }
    }
  }

  private async handleCardCreate (postTx: Array<TxCUD<Doc>>, etx: Tx): Promise<void> {
    if (etx._class === core.class.TxCreateDoc) {
      const createTx = etx as TxCreateDoc<Card>
      const doc = TxProcessor.createDoc2Doc(createTx)
      const hierarchy = this.client.getHierarchy()
      if (!hierarchy.isDerived(createTx.objectClass, cardPlugin.class.Card)) return

      // We don't need to start new processes for new version
      if (doc.baseId !== undefined && doc.baseId !== doc._id) return

      const ancestors = hierarchy
        .getAncestors(createTx.objectClass)
        .filter((p) => hierarchy.isDerived(p, cardPlugin.class.Card))

      const processes = this.client.getModel().findAllSync(process.class.Process, {
        masterTag: { $in: ancestors },
        autoStart: true
      })
      for (const proc of processes) {
        const res = await createExecution(createTx.objectId, proc._id, createTx.objectSpace, this.txFactory)
        if (res !== undefined) postTx.push(res)
      }
    }
  }

  private async handleTagAdd (postTx: Array<TxCUD<Doc>>, tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxMixin) return
    const mixinTx = tx as TxMixin<Card, Card>
    const hierarchy = this.client.getHierarchy()
    if (!hierarchy.isDerived(mixinTx.objectClass, cardPlugin.class.Card)) return
    if (Object.keys(mixinTx.attributes).length !== 0) return

    const processes = this.client
      .getModel()
      .findAllSync(process.class.Process, { masterTag: mixinTx.mixin, autoStart: true })
    for (const proc of processes) {
      const res = await createExecution(mixinTx.objectId, proc._id, mixinTx.objectSpace, this.txFactory)
      if (res !== undefined) postTx.push(res)
    }
  }

  private async handleApproveRequest (preTx: Array<TxCUD<Doc>>, etx: Tx): Promise<void> {
    if (etx._class === core.class.TxUpdateDoc) {
      const cud = etx as TxUpdateDoc<ApproveRequest>
      if (cud.objectClass !== process.class.ApproveRequest) return
      if (cud.operations.doneOn == null || cud.operations.approved == null) return
      const approveRequest = await this.client.findOne(process.class.ApproveRequest, {
        _id: cud.objectId
      })
      if (approveRequest === undefined) return
      const execution = await this.client.findOne(process.class.Execution, {
        _id: approveRequest.execution
      })
      if (execution === undefined) return
      const transitions = this.client.getModel().findAllSync(
        process.class.Transition,
        {
          process: execution.process,
          from: execution.currentState,
          trigger: cud.operations.approved
            ? process.trigger.OnApproveRequestApproved
            : process.trigger.OnApproveRequestRejected
        },
        { sort: { rank: SortingOrder.Ascending } }
      )
      const updatedApproveRequest = TxProcessor.updateDoc2Doc(approveRequest, cud)
      const inputContext = {
        ...execution.context,
        todo: updatedApproveRequest
      }
      const transition = await pickTransition(this.client, execution, transitions, inputContext)
      if (transition === undefined) return
      const result = await getNextStateUserInput(execution, transition, execution.context, inputContext)
      if (result?.changed === true) {
        preTx.push(
          this.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
            context: result.context
          })
        )
      }
    }
  }

  private async handleToDoDone (preTx: Array<TxCUD<Doc>>, etx: Tx): Promise<void> {
    if (etx._class === core.class.TxUpdateDoc) {
      const cud = etx as TxUpdateDoc<ProcessToDo>
      if (cud.objectClass !== process.class.ProcessToDo) return
      if (cud.operations.doneOn == null) return
      const todo = await this.client.findOne(process.class.ProcessToDo, {
        _id: cud.objectId
      })
      if (todo === undefined) return
      const execution = await this.client.findOne(process.class.Execution, {
        _id: todo.execution
      })
      if (execution === undefined) return

      const context = await requestResult(execution, todo.results, execution.context)

      const transitions = this.client.getModel().findAllSync(process.class.Transition, {
        process: execution.process,
        from: execution.currentState,
        trigger: process.trigger.OnToDoClose
      })
      const inputContext = {
        ...(context ?? execution.context),
        todo
      }
      const transition = await pickTransition(this.client, execution, transitions, inputContext)
      if (transition === undefined) {
        if (context !== undefined) {
          preTx.push(
            this.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
              context
            })
          )
        }
        return
      }
      const finalResult = await getNextStateUserInput(execution, transition, context ?? execution.context, inputContext)
      if (finalResult?.changed === true) {
        preTx.push(
          this.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
            context: finalResult.context
          })
        )
      } else if (context !== undefined) {
        preTx.push(
          this.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
            context
          })
        )
      }
    }
  }
}
