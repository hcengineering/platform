import { Analytics } from '@hcengineering/analytics'
import type {
  Doc,
  Domain,
  DomainIndexConfiguration,
  FieldIndexConfig,
  Hierarchy,
  MeasureContext,
  ModelDb,
  WorkspaceUuid
} from '@hcengineering/core'
import core, { DOMAIN_BENCHMARK, DOMAIN_MODEL, IndexKind, IndexOrder } from '@hcengineering/core'
import { deepEqual } from 'fast-equals'
import type { DomainHelper, DomainHelperOperations } from './adapter'

export class DomainIndexHelperImpl implements DomainHelper {
  domains = new Map<Domain, Set<FieldIndexConfig<Doc>>>()
  domainConfigurations: DomainIndexConfiguration[] = []
  constructor (
    readonly ctx: MeasureContext,
    readonly hierarchy: Hierarchy,
    readonly model: ModelDb,
    readonly workspaceId: WorkspaceUuid
  ) {
    const classes = model.findAllSync(core.class.Class, {})

    try {
      this.domainConfigurations =
        model.findAllSync<DomainIndexConfiguration>(core.class.DomainIndexConfiguration, {}) ?? []
    } catch (err: any) {
      this.domainConfigurations = []
      Analytics.handleError(err)
      ctx.error('failed to find domain index configuration', { err })
    }

    this.domains = new Map<Domain, Set<FieldIndexConfig<Doc>>>()
    // Find all domains and indexed fields inside
    for (const c of classes) {
      try {
        const domain = hierarchy.findDomain(c._id)
        if (domain === undefined || domain === DOMAIN_MODEL || domain === DOMAIN_BENCHMARK) {
          continue
        }
        const attrs = hierarchy.getAllAttributes(c._id)
        const domainAttrs = this.domains.get(domain) ?? new Set<FieldIndexConfig<Doc>>()
        for (const a of attrs.values()) {
          if (a.isCustom === true) {
            // Skip custom attribute indexes
            continue
          }
          if (a.index !== undefined && a.index !== IndexKind.FullText) {
            domainAttrs.add({
              keys: {
                [a.name]: a.index === IndexKind.Indexed ? IndexOrder.Ascending : IndexOrder.Descending
              },
              sparse: false // Default to non sparse indexes
            })
          }
        }

        // Handle extra configurations
        if (hierarchy.hasMixin(c, core.mixin.IndexConfiguration)) {
          const config = hierarchy.as(c, core.mixin.IndexConfiguration)
          for (const attr of config.indexes) {
            if (typeof attr === 'string') {
              domainAttrs.add({ keys: { [attr]: IndexOrder.Ascending }, sparse: false })
            } else {
              domainAttrs.add(attr)
            }
          }
        }

        this.domains.set(domain, domainAttrs)
      } catch (err: any) {
        // Ignore, since we have classes without domain.
      }
    }
  }

  /**
   * Check if some indexes need to be created for domain.
   */
  async checkDomain (
    ctx: MeasureContext,
    domain: Domain,
    documents: number,
    operations: DomainHelperOperations
  ): Promise<void> {
    const domainInfo = this.domains.get(domain)
    const cfg = this.domainConfigurations.find((it) => it.domain === domain)

    const bb: (string | FieldIndexConfig<Doc>)[] = []
    const added = new Set<string>()

    try {
      if (!(await operations.exists(domain))) {
        return
      }
      const has50Documents = documents > 50
      const allIndexes = (await operations.listIndexes(domain)).filter((it) => it.name !== '_id_')
      ctx.info('check indexes', { domain, has50Documents, documents })
      if (has50Documents) {
        async function checkIndex (vv: string | FieldIndexConfig<Doc>, checkDisabled: boolean): Promise<void> {
          try {
            let name: string
            if (typeof vv === 'string') {
              name = `${vv}_sp_1`
            } else {
              let pfix = ''
              if (vv.filter !== undefined) {
                pfix += '_fi'
              } else if (vv.sparse === true) {
                pfix += '_sp'
              }
              name = Object.entries(vv.keys)
                .map(([key, val]) => `${key + pfix}_${val}`)
                .join('_')
            }

            // Check if index is disabled or not
            let isDisabled =
              cfg?.disabled?.some((it) => {
                const _it = typeof it === 'string' ? { [it]: 1 } : it
                const _vv = typeof vv === 'string' ? { [vv]: 1 } : vv.keys
                return deepEqual(_it, _vv)
              }) ?? false

            if (!checkDisabled) {
              isDisabled = false
            }
            if (isDisabled) {
              // skip index since it is disabled
              return
            }
            if (added.has(name)) {
              // Index already added
              return
            }
            added.add(name)

            const existingOne = allIndexes.findIndex((it) => it.name === name)
            if (existingOne !== -1) {
              allIndexes.splice(existingOne, 1)
            }
            const exists = existingOne !== -1
            // Check if index exists
            if (!exists && !isDisabled) {
              // Check if not disabled
              bb.push(vv)
              await operations.createIndex(domain, vv, {
                name
              })
            }
          } catch (err: any) {
            Analytics.handleError(err)
            ctx.error('error: failed to create index', { domain, vv, err })
          }
        }

        for (const vv of [...(domainInfo?.values() ?? [])]) {
          await checkIndex(vv, true)
        }
        for (const vv of [...(cfg?.indexes ?? [])]) {
          await checkIndex(vv, false)
        }
      }
      if (allIndexes.length > 0) {
        for (const c of allIndexes) {
          try {
            if (cfg?.skip !== undefined) {
              if (Array.from(cfg.skip ?? []).some((it) => c.name.includes(it))) {
                continue
              }
            }
            ctx.info('drop index', { domain, name: c.name, has50Documents })
            await operations.dropIndex(domain, c.name)
          } catch (err: any) {
            Analytics.handleError(err)
            console.error('error: failed to drop index', { c, err })
          }
        }
      }
    } catch (err: any) {
      ctx.error('error during domain collections/indexes check', { domain, error: err })
      Analytics.handleError(err)
    }

    if (bb.length > 0) {
      ctx.info('created indexes', { domain, bb })
    }
  }
}
