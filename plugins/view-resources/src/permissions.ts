import { type PermissionsStore } from '@hcengineering/contact'
import core, {
  type AnyAttribute,
  type Class,
  type Doc,
  type Permission,
  type Ref,
  type Space,
  type TypedSpace
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'

export function canChangeAttribute (
  attr: AnyAttribute,
  space: Ref<TypedSpace>,
  store: PermissionsStore,
  _class?: Ref<Class<Doc>>
): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  if (store.whitelist.has(space)) return true
  const forbiddenId = `${attr._id}_forbidden` as Ref<Permission>
  const forbidden = store.ps[space]?.has(forbiddenId)
  if (forbidden) {
    return false
  }
  const allowedId = `${attr._id}_allowed` as Ref<Permission>
  const allowed = store.ps[space]?.has(allowedId)
  if (allowed) {
    return true
  }

  return canChangeDoc(_class ?? attr.attributeOf, space, store)
}

export function canChangeDoc (_class: Ref<Class<Doc>>, space: Ref<Space>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  if (store.whitelist.has(space)) return true
  if (store.ps[space] !== undefined) {
    const client = getClient()
    const h = client.getHierarchy()
    const ancestors = h.getAncestors(_class)
    const permissions = client
      .getModel()
      .findAllSync(core.class.Permission, { txClass: { $in: [core.class.TxUpdateDoc, core.class.TxMixin] } })
    for (const ancestor of ancestors) {
      const curr = permissions.filter(
        (p) =>
          p.objectClass === ancestor &&
          p.txMatch === undefined &&
          p.txClass === (h.isMixin(ancestor) ? core.class.TxMixin : core.class.TxUpdateDoc)
      )
      for (const permission of curr) {
        if (store.ps[space]?.has(permission._id)) {
          return permission.forbid !== true
        }
      }
    }
  }

  return !store.restrictedSpaces.has(space)
}
