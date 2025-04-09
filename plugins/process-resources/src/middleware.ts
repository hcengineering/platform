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

import core, {
  getCurrentAccount,
  type TxCreateDoc,
  type TxMixin,
  TxOperations,
  type Client,
  type Tx,
  type TxApplyIf,
  type TxResult,
  type TxUpdateDoc
} from '@hcengineering/core'
import { BasePresentationMiddleware, type PresentationMiddleware } from '@hcengineering/presentation'
import process, { type ProcessToDo } from '@hcengineering/process'
import { createExecution, getNextStateUserInput } from './utils'
import cardPlugin, { type Card } from '@hcengineering/card'

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

  async tx (tx: Tx): Promise<TxResult> {
    await this.handleTx(tx)
    return await this.provideTx(tx)
  }

  private async handleTx (...txes: Tx[]): Promise<void> {
    for (const etx of txes) {
      if (etx._class === core.class.TxApplyIf) {
        const applyIf = etx as TxApplyIf
        await this.handleTx(...applyIf.txes)
      }

      await this.handleCardCreate(etx)
      await this.handleTagAdd(etx)
      await this.handleToDoDone(etx)
    }
  }

  private async handleCardCreate (etx: Tx): Promise<void> {
    if (etx._class === core.class.TxCreateDoc) {
      const createTx = etx as TxCreateDoc<Card>
      const hierarchy = this.client.getHierarchy()
      if (!hierarchy.isDerived(createTx.objectClass, cardPlugin.class.Card)) return
      const ancestors = hierarchy
        .getAncestors(createTx.objectClass)
        .filter((p) => hierarchy.isDerived(p, cardPlugin.class.Card))

      const processes = this.client.getModel().findAllSync(process.class.Process, {
        masterTag: { $in: ancestors },
        autoStart: true
      })
      for (const proc of processes) {
        await createExecution(createTx.objectId, proc._id)
      }
    }
  }

  private async handleTagAdd (tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxMixin) return
    const mixinTx = tx as TxMixin<Card, Card>
    const hierarchy = this.client.getHierarchy()
    if (!hierarchy.isDerived(mixinTx.objectClass, cardPlugin.class.Card)) return
    if (Object.keys(mixinTx.attributes).length !== 0) return

    const processes = this.client
      .getModel()
      .findAllSync(process.class.Process, { masterTag: mixinTx.mixin, autoStart: true })
    for (const proc of processes) {
      await createExecution(mixinTx.objectId, proc._id)
    }
  }

  private async handleToDoDone (etx: Tx): Promise<void> {
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
      const context = await getNextStateUserInput(execution, execution.context ?? {})
      const txop = new TxOperations(this.client, getCurrentAccount().primarySocialId)
      await txop.update(execution, {
        context
      })
    }
  }
}
