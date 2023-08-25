import core, {
  Doc,
  Ref,
  AnyAttribute,
  Class,
  DocumentQuery,
  FindOptions,
  Client,
  Tx,
  TxResult,
  FindResult,
  Attribute,
  Hierarchy,
  RefTo,
  generateId
} from '@hcengineering/core'
import { BasePresentationMiddleware, PresentationMiddleware } from '@hcengineering/presentation'
import view, { AggregationManager } from '@hcengineering/view'
import { getResource } from '@hcengineering/platform'

/**
 * @public
 */
export interface DocSubScriber<T extends Doc = Doc> {
  attributes: Array<Ref<AnyAttribute>>

  _class: Ref<Class<T>>
  query: DocumentQuery<T>
  options?: FindOptions<T>

  refresh: () => void
}

/**
 * @public
 */
export class AggregationMiddleware extends BasePresentationMiddleware implements PresentationMiddleware {
  mgrs: Map<Ref<Class<Doc>>, AggregationManager> = new Map<Ref<Class<Doc>>, AggregationManager>()
  docs: Doc[] | undefined

  subscribers: Map<string, DocSubScriber> = new Map<string, DocSubScriber>()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
  }

  static create (client: Client, next?: PresentationMiddleware): AggregationMiddleware {
    return new AggregationMiddleware(client, next)
  }

  async notifyTx (tx: Tx): Promise<void> {
    const promises: Array<Promise<void>> = []
    for (const [, value] of this.mgrs) {
      promises.push(value.notifyTx(tx))
    }
    await Promise.all(promises)
    await this.provideNotifyTx(tx)
  }

  async close (): Promise<void> {
    this.mgrs.forEach((mgr) => mgr.close())
    return await this.provideClose()
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }

  private refreshSubscribers (): void {
    for (const s of this.subscribers.values()) {
      // TODO: Do something more smart and track if used component field is changed.
      s.refresh()
    }
  }

  async subscribe<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options: FindOptions<T> | undefined,
    refresh: () => void
  ): Promise<{
      unsubscribe: () => void
      query?: DocumentQuery<T>
      options?: FindOptions<T>
    }> {
    const ret = await this.provideSubscribe(_class, query, options, refresh)
    const h = this.client.getHierarchy()

    const id = generateId()
    const s: DocSubScriber<T> = {
      _class,
      query,
      refresh,
      options,
      attributes: []
    }
    const statusFields: Array<Attribute<Doc>> = []
    const allAttrs = h.getAllAttributes(_class)

    const updatedQuery: DocumentQuery<T> = h.clone(ret.query ?? query)
    const finalOptions = h.clone(ret.options ?? options ?? {})

    await this.updateQueryOptions<T>(allAttrs, h, statusFields, updatedQuery, finalOptions)

    if (statusFields.length > 0) {
      this.subscribers.set(id, s)
      return {
        unsubscribe: () => {
          ret.unsubscribe()
          this.subscribers.delete(id)
        },
        query: updatedQuery,
        options: finalOptions
      }
    }
    return { unsubscribe: (await ret).unsubscribe }
  }

  private async getAggregationManager (_class: Ref<Class<Doc>>): Promise<AggregationManager | undefined> {
    let mgr = this.mgrs.get(_class)

    if (mgr === undefined) {
      const h = this.client.getHierarchy()
      const mixin = h.classHierarchyMixin(_class, view.mixin.Aggregation)
      if (mixin?.createAggregationManager !== undefined) {
        const f = await getResource(mixin.createAggregationManager)
        mgr = f(this.client, () => this.refreshSubscribers())
        this.mgrs.set(_class, mgr)
      }
    }

    return mgr
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    const docFields: Array<Attribute<Doc>> = []
    const h = this.client.getHierarchy()
    const allAttrs = h.getAllAttributes(_class)
    const finalOptions = h.clone(options ?? {})

    const fquery = h.clone(query ?? {})

    await this.updateQueryOptions<T>(allAttrs, h, docFields, fquery, finalOptions)

    const result = await this.provideFindAll(_class, fquery, finalOptions)
    // We need to add $
    if (docFields.length > 0) {
      // We need to update $lookup for doc fields and provide $doc group fields.
      for (const attr of docFields) {
        for (const r of result) {
          const resultDoc = Hierarchy.toDoc(r)
          if (resultDoc.$lookup === undefined) {
            resultDoc.$lookup = {}
          }

          const mgr = await this.getAggregationManager((attr.type as RefTo<Doc>).to)
          if (mgr !== undefined) {
            await mgr.updateLookup(resultDoc, attr)
          }
        }
      }
    }
    return result
  }

  private async updateQueryOptions<T extends Doc>(
    allAttrs: Map<string, AnyAttribute>,
    h: Hierarchy,
    docFields: Array<Attribute<Doc>>,
    query: DocumentQuery<T>,
    finalOptions: FindOptions<T>
  ): Promise<void> {
    for (const attr of allAttrs.values()) {
      try {
        if (attr.type._class !== core.class.RefTo) {
          continue
        }
        const mgr = await this.getAggregationManager((attr.type as RefTo<Doc>).to)
        if (mgr === undefined) {
          continue
        }
        if (h.isDerived((attr.type as RefTo<Doc>).to, mgr.getAttrClass())) {
          let target: Array<Ref<Doc>> = []
          let targetNin: Array<Ref<Doc>> = []
          docFields.push(attr)
          const v = (query as any)[attr.name]

          if (v != null) {
            // Only add filter if we have filer inside.
            if (typeof v === 'string') {
              target.push(v as Ref<Doc>)
            } else {
              if (v.$in !== undefined) {
                target.push(...v.$in)
              } else if (v.$nin !== undefined) {
                targetNin.push(...v.$nin)
              } else if (v.$ne !== undefined) {
                targetNin.push(v.$ne)
              }
            }

            // Find all similar name statues for same attribute name.
            target = await mgr.categorize(target, attr)
            targetNin = await mgr.categorize(targetNin, attr)
            if (target.length > 0 || targetNin.length > 0) {
              ;(query as any)[attr.name] = {}
              if (target.length > 0) {
                ;(query as any)[attr.name].$in = target
              }
              if (targetNin.length > 0) {
                ;(query as any)[attr.name].$nin = targetNin
              }
            }
          }
          if (finalOptions.lookup !== undefined) {
            // Remove lookups by status field
            if ((finalOptions.lookup as any)[attr.name] !== undefined) {
              const { [attr.name]: _, ...newLookup } = finalOptions.lookup as any
              finalOptions.lookup = newLookup
            }
          }

          // Update sorting if defined.
          if (mgr.updateSorting !== undefined) {
            await mgr.updateSorting(finalOptions, attr)
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }
}
