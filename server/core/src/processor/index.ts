import core, {
  Class,
  Doc,
  Hierarchy,
  MeasureContext,
  ModelDb,
  Ref,
  ServerStorage,
  Tx,
  TxCUD,
  TxFactory,
  TxProcessor
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import plugin from '../plugin'
import { AsyncTrigger, AsyncTriggerControl, AsyncTriggerFunc } from '../types'
/**
 * @public
 */
export class AsyncTriggerProcessor {
  canceling: boolean = false

  processing: Promise<void> | undefined

  triggers: AsyncTrigger[] = []

  classes: Ref<Class<Doc>>[] = []

  factory = new TxFactory(core.account.System)

  functions: AsyncTriggerFunc[] = []

  trigger = (): void => {}

  control: AsyncTriggerControl

  constructor (
    readonly model: ModelDb,
    readonly hierarchy: Hierarchy,
    readonly storage: ServerStorage,
    readonly metrics: MeasureContext
  ) {
    this.control = {
      hierarchy: this.hierarchy,
      modelDb: this.model,
      txFactory: this.factory,
      findAll: async (_class, query, options) => {
        return await this.storage.findAll(this.metrics, _class, query, options)
      }
    }
  }

  async cancel (): Promise<void> {
    this.canceling = true
    await this.processing
  }

  async start (): Promise<void> {
    await this.updateTriggers()
    this.processing = this.doProcessing()
  }

  async updateTriggers (): Promise<void> {
    try {
      this.triggers = await this.model.findAll(plugin.class.AsyncTrigger, {})
      this.classes = this.triggers.reduce<Ref<Class<Doc>>[]>((arr, it) => arr.concat(it.classes), [])
      this.functions = await Promise.all(this.triggers.map(async (trigger) => await getResource(trigger.trigger)))
    } catch (err: any) {
      console.error(err)
    }
  }

  async tx (tx: Tx[]): Promise<void> {
    const result: Tx[] = []
    for (const _tx of tx) {
      const actualTx = TxProcessor.extractTx(_tx)
      if (
        this.hierarchy.isDerived(actualTx._class, core.class.TxCUD) &&
        this.hierarchy.isDerived(_tx._class, core.class.TxCUD)
      ) {
        const cud = actualTx as TxCUD<Doc>
        if (this.classes.some((it) => this.hierarchy.isDerived(cud.objectClass, it))) {
          // We need processing
          result.push(
            this.factory.createTxCreateDoc(plugin.class.AsyncTriggerState, plugin.space.TriggerState, {
              tx: _tx as TxCUD<Doc>,
              message: 'Processing...'
            })
          )
        }
      }
    }
    if (result.length > 0) {
      await this.storage.apply(this.metrics, result, false)
      this.processing = this.doProcessing()
    }
  }

  private async doProcessing (): Promise<void> {
    while (!this.canceling) {
      const docs = await this.storage.findAll(this.metrics, plugin.class.AsyncTriggerState, {}, { limit: 10 })
      if (docs.length === 0) {
        return
      }

      for (const doc of docs) {
        const result: Tx[] = []
        if (this.canceling) {
          break
        }

        try {
          for (const f of this.functions) {
            result.push(...(await f(doc.tx, this.control)))
          }
        } catch (err: any) {}
        await this.storage.apply(this.metrics, [this.factory.createTxRemoveDoc(doc._class, doc.space, doc._id)], false)

        await this.storage.apply(this.metrics, result, true)
      }
    }
  }
}
