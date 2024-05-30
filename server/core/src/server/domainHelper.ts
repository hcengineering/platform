import type {
  Doc,
  Domain,
  DomainIndexConfiguration,
  FieldIndex,
  Hierarchy,
  MeasureContext,
  ModelDb
} from '@hcengineering/core'
import core, { DOMAIN_MODEL, IndexKind, IndexOrder } from '@hcengineering/core'
import { deepEqual } from 'fast-equals'
import type { DomainHelper, DomainHelperOperations } from '../adapter'
import { Analytics } from '@hcengineering/analytics'

export class DomainIndexHelperImpl implements DomainHelper {
  domains = new Map<Domain, Set<string | FieldIndex<Doc>>>()
  domainConfigurations: DomainIndexConfiguration[] = []
  constructor (
    readonly hierarchy: Hierarchy,
    readonly model: ModelDb
  ) {
    const classes = model.findAllSync(core.class.Class, {})

    this.domainConfigurations =
      model.findAllSync<DomainIndexConfiguration>(core.class.DomainIndexConfiguration, {}) ?? []

    this.domains = new Map<Domain, Set<string | FieldIndex<Doc>>>()
    // Find all domains and indexed fields inside
    for (const c of classes) {
      try {
        const domain = hierarchy.findDomain(c._id)
        if (domain === undefined || domain === DOMAIN_MODEL) {
          continue
        }
        const attrs = hierarchy.getAllAttributes(c._id)
        const domainAttrs = this.domains.get(domain) ?? new Set<string | FieldIndex<Doc>>()
        for (const a of attrs.values()) {
          if (a.index !== undefined && (a.index === IndexKind.Indexed || a.index === IndexKind.IndexedDsc)) {
            if (a.index === IndexKind.Indexed) {
              domainAttrs.add(a.name)
            } else {
              domainAttrs.add({ [a.name]: IndexOrder.Descending })
            }
          }
        }

        // Handle extra configurations
        if (hierarchy.hasMixin(c, core.mixin.IndexConfiguration)) {
          const config = hierarchy.as(c, core.mixin.IndexConfiguration)
          for (const attr of config.indexes) {
            domainAttrs.add(attr)
          }
        }

        this.domains.set(domain, domainAttrs)
      } catch (err: any) {
        // Ignore, since we have classes without domain.
      }
    }
  }

  /**
   * return false if and only if domain underline structures are not required.
   */
  async checkDomain (
    ctx: MeasureContext,
    domain: Domain,
    forceCreate: boolean,
    operations: DomainHelperOperations
  ): Promise<boolean> {
    const domainInfo = this.domains.get(domain)
    const cfg = this.domainConfigurations.find((it) => it.domain === domain)

    let exists = operations.exists(domain)
    const hasDocuments = exists && (await operations.hasDocuments(domain, 1))
    // Drop collection if it exists and should not exists or doesn't have documents.
    if (exists && (cfg?.disableCollection === true || (!hasDocuments && !forceCreate))) {
      // We do not need this collection
      return false
    }

    if (forceCreate && !exists) {
      await operations.create(domain)
      console.log('collection will be created', domain)
      exists = true
    }
    if (!exists) {
      // Do not need to create, since not force and no documents.
      return false
    }
    const bb: (string | FieldIndex<Doc>)[] = []
    const added = new Set<string>()

    try {
      const has50Documents = await operations.hasDocuments(domain, 50)
      const allIndexes = (await operations.listIndexes(domain)).filter((it) => it.name !== '_id_')
      console.log('check indexes', domain, has50Documents)
      if (has50Documents) {
        for (const vv of [...(domainInfo?.values() ?? []), ...(cfg?.indexes ?? [])]) {
          try {
            const name =
              typeof vv === 'string'
                ? `${vv}_1`
                : Object.entries(vv)
                  .map(([key, val]) => `${key}_${val}`)
                  .join('_')

            // Check if index is disabled or not
            const isDisabled =
              cfg?.disabled?.some((it) => {
                const _it = typeof it === 'string' ? { [it]: 1 } : it
                const _vv = typeof vv === 'string' ? { [vv]: 1 } : vv
                return deepEqual(_it, _vv)
              }) ?? false
            if (isDisabled) {
              // skip index since it is disabled
              continue
            }
            if (added.has(name)) {
              // Index already added
              continue
            }
            added.add(name)

            const existingOne = allIndexes.findIndex((it) => it.name === name)
            if (existingOne !== -1) {
              allIndexes.splice(existingOne, 1)
            }
            const exists = existingOne !== -1
            // Check if index exists
            if (!exists) {
              if (!isDisabled) {
                // Check if not disabled
                bb.push(vv)
                await operations.createIndex(domain, vv, {
                  name
                })
              }
            }
          } catch (err: any) {
            Analytics.handleError(err)
            ctx.error('error: failed to create index', { domain, vv, err })
          }
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
      Analytics.handleError(err)
    }

    if (bb.length > 0) {
      ctx.info('created indexes', { domain, bb })
    }

    return true
  }
}
