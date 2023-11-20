import { type Class, type Doc, type DocumentQuery, type Ref, type Space, matchQuery } from '@hcengineering/core'
import { getClient } from '.'
import presentation from './plugin'

export interface RuleApplyResult<T extends Doc> {
  fieldQuery: DocumentQuery<T>
  disableUnset: boolean
  disableEdit: boolean
}

export const emptyRuleApplyResult: RuleApplyResult<Doc> = {
  fieldQuery: {},
  disableUnset: false,
  disableEdit: false
}
/**
 * @public
 */
export function getDocRules<T extends Doc> (documents: Doc | Doc[], field: string): RuleApplyResult<T> | undefined {
  const docs = Array.isArray(documents) ? documents : [documents]
  if (docs.length === 0) {
    return emptyRuleApplyResult as RuleApplyResult<T>
  }
  const c = getClient()
  const h = c.getHierarchy()

  const _class = docs[0]._class
  for (const d of docs) {
    if (d._class !== _class) {
      // If we have different classes, we should return undefined.
      return undefined
    }
  }

  const rulesSet = c.getModel().findAllSync(presentation.class.DocRules, { ofClass: { $in: h.getAncestors(_class) } })
  let fieldQuery: DocumentQuery<T> = {}
  let disableUnset = false
  let disableEdit = false
  for (const rules of rulesSet) {
    if (h.isDerived(_class, rules.ofClass)) {
      // Check individual rules and form a result query
      for (const r of rules.fieldRules) {
        if (r.field === field) {
          const _docs = docs
            .map((doc) => (r.mixin !== undefined ? (h.hasMixin(doc, r.mixin) ? h.as(doc, r.mixin) : undefined) : doc))
            .filter((it) => it) as Doc[]
          if (_docs.length === 0) {
            continue
          }
          if (matchQuery(_docs, r.query, r.mixin ?? rules.ofClass, h).length === _docs.length) {
            // We have rule match.
            if (r.disableUnset === true) {
              disableUnset = true
            }
            if (r.disableEdit === true) {
              disableEdit = true
            }
            if (r.fieldQuery != null) {
              fieldQuery = { ...fieldQuery, ...r.fieldQuery }
            }

            for (const [sourceK, targetK] of Object.entries(r.fieldQueryFill ?? {})) {
              const v = (_docs[0] as any)[sourceK]
              for (const d of _docs) {
                const newV = (d as any)[sourceK]
                if (newV !== v && r.allowConflict === false) {
                  // Value conflict, we could not choose one.
                  return undefined
                }
                ;(fieldQuery as any)[targetK] = newV
              }
            }
          }
        }
      }
    }
  }

  return {
    fieldQuery,
    disableUnset,
    disableEdit
  }
}

/**
 * @public
 */
export function isCreateAllowed (_class: Ref<Class<Doc>>, space: Space): boolean {
  const c = getClient()
  const h = c.getHierarchy()

  const rules = c.getModel().findAllSync(presentation.class.DocRules, { ofClass: _class })
  for (const r of rules) {
    if (r.createRule !== undefined) {
      if (r.createRule.mixin !== undefined) {
        if (h.hasMixin(space, r.createRule.mixin)) {
          const _mixin = h.as(space, r.createRule.mixin)
          if (matchQuery([_mixin], r.createRule.disallowQuery, r.createRule.mixin ?? space._class, h).length === 1) {
            return false
          }
        }
      } else {
        if (matchQuery([space], r.createRule.disallowQuery, r.createRule.mixin ?? space._class, h).length === 1) {
          return false
        }
      }
    }
  }
  return true
}
