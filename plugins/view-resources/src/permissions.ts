import contact, { type PermissionsStore } from '@hcengineering/contact'
import core, {
  AccountRole,
  hasAccountRole,
  isGuestRole,
  isReadOnlyRole,
  onCurrentAccountChanged,
  type Account,
  type AnyAttribute,
  type Class,
  type Doc,
  type Permission,
  type Ref,
  type Space,
  type TypedSpace
} from '@hcengineering/core'
import { type Restrictions } from '@hcengineering/guest'
import { getMetadata, getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { derived, writable, type Readable } from 'svelte/store'

import { restrictionStore } from './utils'

export function canChangeAttribute (
  attr: AnyAttribute,
  space: Ref<TypedSpace>,
  store: PermissionsStore,
  _class: Ref<Class<Doc>>
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

  const target = attr.attributeOf
  const forbiddenClId = `${target}_forbidden` as Ref<Permission>
  const forbiddenCl = store.ps[space]?.has(forbiddenClId)
  if (forbiddenCl) {
    return false
  }
  const allowedClId = `${target}_allowed` as Ref<Permission>
  const allowedCl = store.ps[space]?.has(allowedClId)
  if (allowedCl) {
    return true
  }

  return canChangeDoc(_class, space, store)
}

export function canChangeDoc (_class: Ref<Class<Doc>>, space: Ref<Space>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  if (store.whitelist.has(space)) return true
  if (store.ps[space] !== undefined) {
    const forbiddenClId = `${_class}_forbidden` as Ref<Permission>
    const forbiddenCl = store.ps[space]?.has(forbiddenClId)
    if (forbiddenCl) {
      return false
    }
    const allowedClId = `${_class}_allowed` as Ref<Permission>
    const allowedCl = store.ps[space]?.has(allowedClId)
    if (allowedCl) {
      return true
    }
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

export function canRemoveDoc (_class: Ref<Class<Doc>>, space: Ref<Space>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  if (store.whitelist.has(space)) return true
  if (store.ps[space] !== undefined) {
    const client = getClient()
    const h = client.getHierarchy()
    const ancestors = h.getAncestors(_class)
    const permissions = client.getModel().findAllSync(core.class.Permission, { txClass: core.class.TxRemoveDoc })
    for (const ancestor of ancestors) {
      const curr = permissions.filter((p) => p.objectClass === ancestor && p.txMatch === undefined)
      for (const permission of curr) {
        if (store.ps[space]?.has(permission._id)) {
          return permission.forbid !== true
        }
      }
    }
  }

  return !store.restrictedSpaces.has(space)
}

export function canCreateObject (_class: Ref<Class<Doc>>, space: Ref<Space>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  if (store.whitelist.has(space)) return true
  if (store.ps[space] !== undefined) {
    const client = getClient()
    const h = client.getHierarchy()
    const ancestors = h.getAncestors(_class)
    const permissions = client.getModel().findAllSync(core.class.Permission, { txClass: core.class.TxCreateDoc })
    for (const ancestor of ancestors) {
      const curr = permissions.filter((p) => p.objectClass === ancestor && p.txMatch === undefined)
      for (const permission of curr) {
        if (store.ps[space]?.has(permission._id)) {
          return permission.forbid !== true
        }
      }
    }
  }

  return !store.restrictedSpaces.has(space)
}

/**
 * Describes what the current user is allowed to do.
 *
 * This is the single entry point for the UI: components ask what the user *can do*
 * instead of checking who the user *is*. All AccountRole comparisons, space permissions
 * and guest link restrictions are resolved inside this module.
 *
 * @public
 */
export interface Permissions {
  // Workspace level
  canManageWorkspace: boolean

  // Space level
  canEditSpace: (space: Space | undefined) => boolean
  canArchiveSpace: (space: Space | undefined) => boolean
  canAddMembers: (space: Space | undefined) => boolean
  canRemoveMembers: (space: Space | undefined) => boolean
  canJoinSpace: (space: Space | undefined) => boolean
  canLeaveSpace: (space: Space | undefined) => boolean

  // Document level
  canCreate: (_class: Ref<Class<Doc>>, space: Ref<Space>) => boolean
  canEdit: (doc: Doc | undefined) => boolean
  canEditAttribute: (doc: Doc | undefined, attr: AnyAttribute) => boolean
  canRemove: (doc: Doc | undefined) => boolean

  // Members and participants
  canEditMembers: (doc: Doc | undefined, attr?: AnyAttribute) => boolean
  canOpenEmployeePreview: boolean

  // Activity and communications
  canViewActivity: (doc: Doc | undefined) => boolean
  canComment: (doc: Doc | undefined) => boolean
  canReact: (doc: Doc | undefined) => boolean
  canTrackReadStatus: boolean
}

/**
 * Nothing is allowed. Used until permissions data is loaded, so the UI never flashes
 * controls the user is not allowed to use.
 */
const forbidAll: Permissions = {
  canManageWorkspace: false,
  canEditSpace: () => false,
  canArchiveSpace: () => false,
  canAddMembers: () => false,
  canRemoveMembers: () => false,
  canJoinSpace: () => false,
  canLeaveSpace: () => false,
  canCreate: () => false,
  canEdit: () => false,
  canEditAttribute: () => false,
  canRemove: () => false,
  canEditMembers: () => false,
  canOpenEmployeePreview: false,
  canViewActivity: () => false,
  canComment: () => false,
  canReact: () => false,
  canTrackReadStatus: false
}

export function isTypedSpace (space: Space): space is TypedSpace {
  return getClient().getHierarchy().isDerived(space._class, core.class.TypedSpace)
}

export function isSpace (doc: Doc): doc is Space {
  return getClient().getHierarchy().isDerived(doc._class, core.class.Space)
}

export function isSpaceOwner (space: Space, account: Account): boolean {
  return account.role === AccountRole.Owner || (space.owners ?? []).includes(account.uuid)
}

/**
 * Whether the document was created by the account. Mirrors
 * GuestPermissionsMiddleware.isCreatedByAccount on the server.
 * @public
 */
export function isDocCreatedByAccount (doc: Doc, account: Account): boolean {
  const creator = doc.createdBy
  if (creator === undefined) return false
  if (creator === account.primarySocialId) return true
  return account.socialIds.includes(creator)
}

/**
 * A guest owns what it created and may act on it. DocGuest and ReadOnlyGuest are deliberately
 * excluded: the server rejects every transaction coming from those roles.
 * @public
 */
export function ownsDoc (doc: Doc | undefined, account: Account): boolean {
  if (doc === undefined) return false
  if (account.role !== AccountRole.Guest) return false
  return isDocCreatedByAccount(doc, account)
}

function hasSpacePermission (permission: Ref<Permission>, space: Ref<Space>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  return (store.whitelist.has(space) || store.ps[space]?.has(permission)) ?? false
}

function buildPermissions (
  account: Account,
  store: PermissionsStore | undefined,
  restrictions: Restrictions
): Permissions {
  const isGuest = isGuestRole(account.role)
  const isReadOnly = isReadOnlyRole(account.role) || restrictions.readonly
  const isUser = hasAccountRole(account, AccountRole.User)

  // A guest is allowed to work with the documents it created itself. This mirrors
  // GuestPermissionsMiddleware.isGuestMutationOnOwnDoc on the server.
  const isOwn = (doc: Doc | undefined): boolean => ownsDoc(doc, account)

  // Guests are never allowed to change space membership or settings. This mirrors
  // GuestPermissionsMiddleware.isForbiddenSpaceTx on the server, which rejects any change
  // of members, private, archived, owners, autoJoin and any $push/$pull.
  const canEditSpace = (space: Space | undefined): boolean => {
    if (space === undefined || isReadOnly || isGuest) return false
    if (isSpaceOwner(space, account)) return true
    if (store === undefined) return false
    if (hasSpacePermission(core.permission.UpdateObject, core.space.Space, store)) return true
    if (isTypedSpace(space) && hasSpacePermission(core.permission.UpdateSpace, space._id, store)) return true
    return false
  }

  const canRemoveMembers = (space: Space | undefined): boolean => {
    if (space === undefined || isReadOnly || isGuest) return false
    if (canEditSpace(space)) return true
    if (hasAccountRole(account, AccountRole.Maintainer)) return true
    if (space.createdBy !== undefined && account.socialIds.includes(space.createdBy)) return true
    return false
  }

  const canAddMembers = (space: Space | undefined): boolean => {
    if (space === undefined || isReadOnly || isGuest) return false
    if (canRemoveMembers(space)) return true
    // Spaces without a space type are not permission controlled, same as the whitelist in
    // PermissionsStore. Their members may invite other users, but removing members remains
    // restricted to owners, maintainers and space creators.
    return !isTypedSpace(space) && (space.members ?? []).includes(account.uuid)
  }

  const canArchiveSpace = (space: Space | undefined): boolean => {
    if (space === undefined || isReadOnly || isGuest) return false
    if (isSpaceOwner(space, account)) return true
    if (store === undefined) return false
    if (hasSpacePermission(core.permission.DeleteObject, core.space.Space, store)) return true
    return isTypedSpace(space) && hasSpacePermission(core.permission.ArchiveSpace, space._id, store)
  }

  const canComment = (doc: Doc | undefined): boolean => {
    if (doc === undefined || isReadOnly || restrictions.disableComments) return false
    if (isUser) return true
    // A public link guest is restricted by the link, not by the role.
    if (account.role === AccountRole.DocGuest) return true
    // A guest may always comment its own documents. Other documents are decided by the
    // communication extension, which knows the guest allowed cards list.
    return isOwn(doc)
  }

  const canEdit = (doc: Doc | undefined): boolean => {
    if (doc === undefined || isReadOnly) return false
    if (isSpace(doc)) return canEditSpace(doc)
    if (isGuest && !isOwn(doc)) return false
    return store !== undefined && canChangeDoc(doc._class, doc.space, store)
  }

  const canEditAttribute = (doc: Doc | undefined, attr: AnyAttribute): boolean => {
    if (doc === undefined || isReadOnly) return false
    if (isSpace(doc)) {
      return attr.name === 'members' ? canAddMembers(doc) || canRemoveMembers(doc) : canEditSpace(doc)
    }
    if (isGuest && !isOwn(doc)) return false
    return store !== undefined && canChangeAttribute(attr, doc.space as Ref<TypedSpace>, store, doc._class)
  }

  const canEditMembers = (doc: Doc | undefined, attr?: AnyAttribute): boolean => {
    if (doc === undefined || isGuest) return false
    if (isSpace(doc)) return canAddMembers(doc) || canRemoveMembers(doc)
    return attr !== undefined ? canEditAttribute(doc, attr) : canEdit(doc)
  }

  return {
    canManageWorkspace: hasAccountRole(account, AccountRole.Maintainer),

    canEditSpace,
    canArchiveSpace,
    canAddMembers,
    canRemoveMembers,
    canJoinSpace: (space) =>
      space !== undefined && !isReadOnly && !isGuest && !(space.members ?? []).includes(account.uuid),
    canLeaveSpace: (space) =>
      space !== undefined && !isReadOnly && !isGuest && (space.members ?? []).includes(account.uuid),

    canCreate: (_class, space) =>
      !isReadOnly && !isGuest && store !== undefined && canCreateObject(_class, space, store),
    canEdit,
    canEditAttribute,
    canRemove: (doc) =>
      doc !== undefined &&
      !isReadOnly &&
      (!isGuest || isOwn(doc)) &&
      store !== undefined &&
      canRemoveDoc(doc._class, doc.space, store),
    canEditMembers,
    canOpenEmployeePreview: !isGuest,

    canViewActivity: (doc) => doc !== undefined && !isGuest && !restrictions.disableComments,
    canComment,
    canReact: canComment,
    canTrackReadStatus: !isReadOnly
  }
}

const accountStore = writable<Account | undefined>(undefined)
const permissionsDataStore = writable<PermissionsStore | undefined>(undefined)

// Loaded on login, not at import: desktop imports this module before plugin locations are registered.
let permissionsStoreState: 'idle' | 'loading' | 'loaded' = 'idle'
function loadPermissionsStore (): void {
  if (permissionsStoreState !== 'idle') return
  permissionsStoreState = 'loading'
  getResource(contact.store.Permissions)
    .then((store) => {
      permissionsStoreState = 'loaded'
      store.subscribe((value) => {
        permissionsDataStore.set(value)
      })
    })
    .catch((err) => {
      permissionsStoreState = 'idle'
      console.error('failed to load the permissions store, space permissions will be denied', err)
    })
}

onCurrentAccountChanged((account) => {
  accountStore.set(account)
  loadPermissionsStore()
})

/**
 * The account permissions are resolved for. Exported so that permission extensions do not have
 * to maintain their own copy of it.
 * @public
 */
export const currentAccountStore: Readable<Account | undefined> = accountStore

const basePermissions: Readable<Permissions> = derived(
  [accountStore, permissionsDataStore, restrictionStore],
  ([account, store, restrictions]) => {
    // Space permissions are loaded asynchronously. Predicates which depend on them stay
    // fail closed until then, the role and restriction based ones work right away.
    if (account === undefined) return forbidAll
    return buildPermissions(account, store, restrictions)
  }
)

const extensionOrder: Array<Readable<Partial<Permissions>>> = []
const extensionValues = new Map<Readable<Partial<Permissions>>, Partial<Permissions>>()
const extensionOverrides = writable<Partial<Permissions>>({})

function recalcOverrides (): void {
  let result: Partial<Permissions> = {}
  for (const extension of extensionOrder) {
    result = { ...result, ...(extensionValues.get(extension) ?? {}) }
  }
  extensionOverrides.set(result)
}

/**
 * Allows a plugin to contribute domain specific permissions which cannot be resolved here,
 * e.g. communications need the guest allowed cards list. Registered later wins.
 *
 * @public
 */
export function registerPermissions (extension: Readable<Partial<Permissions>>): void {
  if (extensionValues.has(extension)) return
  extensionValues.set(extension, {})
  extensionOrder.push(extension)
  extension.subscribe((value) => {
    extensionValues.set(extension, value ?? {})
    recalcOverrides()
  })
}

/**
 * What the current user is allowed to do. Use in components as `$permissions.canComment(doc)`.
 * @public
 */
export const permissions: Readable<Permissions> = derived(
  [basePermissions, extensionOverrides],
  ([base, overrides]) => ({ ...base, ...overrides })
)

// Keep a permanent subscription so that the derived chain stays hot and getPermissions() is a
// field read. Otherwise every call would re-run the whole derivation, and it is called per
// document and per action by the visibility testers.
let snapshot: Permissions = forbidAll
permissions.subscribe((value) => {
  snapshot = value
})

/**
 * Non reactive access to permissions, for action visibility testers and utils.
 * @public
 */
export function getPermissions (): Permissions {
  return snapshot
}
