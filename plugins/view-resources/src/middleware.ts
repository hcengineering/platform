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
  DocManager
} from '@hcengineering/core'
import { BasePresentationMiddleware, PresentationMiddleware } from '@hcengineering/presentation'
import { LiveQuery } from '@hcengineering/query'
import view from '@hcengineering/view'
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
export class DocMiddleware extends BasePresentationMiddleware implements PresentationMiddleware {
  mgrs: Map<Ref<Class<Doc>>, DocManager | Promise<DocManager> | undefined>
  docs: Doc[] | undefined
  query: (() => void) | undefined
  lq: LiveQuery

  subscribers: Map<string, DocSubScriber> = new Map()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
    this.lq = new LiveQuery(client)
    this.mgrs = new Map<Ref<Class<Doc>>, DocManager | Promise<DocManager> | undefined>()
  }

  static create (client: Client, next?: PresentationMiddleware): DocMiddleware {
    return new DocMiddleware(client, next)
  }

  async notifyTx (tx: Tx): Promise<void> {
    await this.lq.tx(tx)
    await this.provideNotifyTx(tx)
  }

  async close (): Promise<void> {
    this.query?.()
    return await this.provideClose()
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }

  async getManager (_class: Ref<Class<Doc>>): Promise<DocManager> {
    const h = this.client.getHierarchy()
    const mixin = h.classHierarchyMixin(_class, view.mixin.CategoryAggregationView)
    if (mixin?.GetManager === undefined) {
      throw new Error('GetManager not found')
    }
    const getManager = await getResource(mixin.GetManager)

    if (mixin?.GetStore === undefined) {
      throw new Error('GetStore not found')
    }
    const getStore = await getResource(mixin.GetStore)

    let findOptions = {}
    if (mixin?.GetFindOptions !== undefined) {
      const getFindOptions = await getResource(mixin.GetFindOptions)
      findOptions = getFindOptions()
    }

    let mgr = this.mgrs.get(_class)
    if (mgr !== undefined) {
      if (mgr instanceof Promise) {
        mgr = await mgr
        this.mgrs.set(_class, mgr)
      }
      return mgr
    }
    mgr = new Promise<DocManager>((resolve) => {
      this.query = this.lq.query(
        _class,
        {},
        (res) => {
          const first = this.docs === undefined
          this.docs = res
          const mgr = getManager(res)
          this.mgrs.set(_class, mgr)
          getStore().set(mgr)
          if (!first) {
            this.refreshSubscribers()
          }
          resolve(mgr)
        },
        findOptions
      )
    })
    this.mgrs.set(_class, mgr)

    return await mgr
  }

  private refreshSubscribers (): void {
    for (const s of this.subscribers.values()) {
      // TODO: Do something more smart and track if used component field is changed.
      s.refresh()
    }
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    const docFields: Array<Attribute<Doc>> = []
    const h = this.client.getHierarchy()
    const allAttrs = h.getAllAttributes(_class)
    const finalOptions = options ?? {}

    await this.updateQueryOptions<T>(allAttrs, h, docFields, query, finalOptions)

    const result = await this.provideFindAll(_class, query, finalOptions)
    // We need to add $
    if (docFields.length > 0) {
      // We need to update $lookup for doc fields and provide $doc group fields.
      for (const attr of docFields) {
        for (const r of result) {
          const resultDoc = Hierarchy.toDoc(r)
          if (resultDoc.$lookup === undefined) {
            resultDoc.$lookup = {}
          }

          // TODO: Check for mixin?
          const value = (r as any)[attr.name]
          const doc = (await this.getManager((attr.type as RefTo<Doc>).to)).getIdMap().get(value)
          if (doc !== undefined) {
            ;(resultDoc.$lookup as any)[attr.name] = doc
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
        const mixin = h.classHierarchyMixin((attr.type as RefTo<Doc>).to, view.mixin.CategoryAggregationView)
        if (mixin?.GetAttrClass === undefined) {
          continue
        }
        const getAttrClass = await getResource(mixin.GetAttrClass)
        if (h.isDerived((attr.type as RefTo<Doc>).to, getAttrClass())) {
          const mgr = await this.getManager((attr.type as RefTo<Doc>).to)
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
            if (mixin?.Categorize === undefined) {
              throw new Error('Categorize not found')
            }
            const categories = await getResource(mixin.Categorize)
            target = categories(mgr, attr, target)
            targetNin = categories(mgr, attr, targetNin)
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
          if (mixin?.UpdateCustomSorting !== undefined) {
            const updateCustomSorting = await getResource(mixin.UpdateCustomSorting)
            updateCustomSorting(finalOptions, attr, mgr)
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }
}
