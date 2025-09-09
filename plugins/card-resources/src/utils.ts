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

import { type Card, CardEvents, cardId, type CardSpace, type MasterTag } from '@hcengineering/card'
import core, {
  AccountRole,
  type Class,
  type Client,
  type Data,
  type Doc,
  type DocumentQuery,
  fillDefaults,
  generateId,
  getCurrentAccount,
  hasAccountRole,
  type Hierarchy,
  makeCollabId,
  type Markup,
  type MarkupBlobRef,
  type Ref,
  type RelatedDocument,
  SortingOrder,
  type Space,
  type TxOperations,
  type WithLookup
} from '@hcengineering/core'
import login from '@hcengineering/login'
import presentation, {
  createMarkup,
  getClient,
  IconWithEmoji,
  MessageBox,
  type ObjectSearchResult
} from '@hcengineering/presentation'
import { type AccountClient, getClient as getAccountClientRaw } from '@hcengineering/account-client'
import {
  getCurrentLocation,
  getCurrentResolvedLocation,
  getPanelURI,
  type IconComponent,
  type IconProps,
  type Location,
  type ResolvedLocation,
  showPopup
} from '@hcengineering/ui'
import view, { encodeObjectURI, canCopyLink } from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import workbench, { type LocationData, type Widget, type WidgetTab } from '@hcengineering/workbench'
import { translate, getMetadata } from '@hcengineering/platform'
import { makeRank } from '@hcengineering/rank'
import { Analytics } from '@hcengineering/analytics'
import { createWidgetTab } from '@hcengineering/workbench-resources'
import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'

import CardSearchItem from './components/CardSearchItem.svelte'
import CreateSpace from './components/navigator/CreateSpace.svelte'
import card from './plugin'
import { type NavigatorConfig } from './types'

export async function deleteMasterTag (tag: MasterTag | undefined, onDelete?: () => void): Promise<void> {
  if (tag !== undefined) {
    const client = getClient()
    if (tag._class === card.class.MasterTag) {
      showPopup(MessageBox, {
        label: card.string.DeleteMasterTag,
        message: card.string.DeleteMasterTagConfirm,
        action: async () => {
          onDelete?.()
          await client.update(tag, { removed: true })
        }
      })
    } else {
      showPopup(MessageBox, {
        label: card.string.DeleteTag,
        message: card.string.DeleteTagConfirm,
        action: async () => {
          onDelete?.()
          await client.remove(tag)
        }
      })
    }
  }
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== cardId) {
    return undefined
  }

  const id = loc.path[3]
  if (loc.path[4] === undefined && id !== undefined && id !== 'browser') {
    return await generateLocation(loc, id)
  }
}

export async function editSpace (value: CardSpace | undefined): Promise<void> {
  if (value !== undefined) {
    showPopup(CreateSpace, { space: value })
  }
}

async function generateLocation (loc: Location, id: string): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(card.class.Card, { _id: id as Ref<Card> })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const space = doc.space
  const special = doc._class

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, cardId, space, special],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export async function resolveLocationData (loc: Location): Promise<LocationData> {
  const special = loc.path[3]
  const base = { nameIntl: card.string.Cards }
  if (special == null) {
    return base
  }

  if (special === 'cards') {
    return base
  }

  const client = getClient()
  const object = await client.findOne(card.class.Card, { _id: special as Ref<Card> })

  if (object === undefined) {
    return base
  }

  return { name: object.title }
}

export async function getCardTitle (client: TxOperations, ref: Ref<Card>, doc?: Card): Promise<string> {
  const object = doc ?? (await client.findOne(card.class.Card, { _id: ref }))
  if (object === undefined) throw new Error(`Card not found, _id: ${ref}`)
  return object.title
}

export async function getCardId (client: TxOperations, ref: Ref<Card>, doc?: Card): Promise<string> {
  const object = doc ?? (await client.findOne(card.class.Card, { _id: ref }))
  if (object === undefined) throw new Error(`Card not found, _id: ${ref}`)
  return object.title
}

export async function getCardLink (doc: Card): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = cardId
  loc.path[3] = doc._id

  return loc
}

export async function queryCard (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Card> = { title: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Card>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Card>)
    }
  }
  return (await client.findAll(card.class.Card, q, { limit: 200 })).map(toCardObjectSearchResult)
}

const toCardObjectSearchResult = (e: WithLookup<Card>): ObjectSearchResult => ({
  doc: e,
  title: e.title,
  icon: card.icon.Card,
  component: CardSearchItem
})

export async function createCard (
  type: Ref<MasterTag>,
  space: Ref<Space>,
  data: Partial<Data<Card>> = {},
  contentMarkup: Markup = EmptyMarkup,
  id?: Ref<Card>
): Promise<Ref<Card>> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
  const title = data.title ?? (await translate(card.string.Card, {}))

  const _id = id ?? generateId()
  const content = isEmptyMarkup(contentMarkup)
    ? ('' as MarkupBlobRef)
    : await createMarkup(makeCollabId(type, _id, 'content'), contentMarkup)

  const _data: Data<Card> = {
    parentInfo: [],
    blobs: {},
    ...data,
    title,
    rank: makeRank(lastOne?.rank, undefined),
    content
  }

  const filledData = fillDefaults(hierarchy, _data, type)

  await client.createDoc(type, space, filledData, _id)

  Analytics.handleEvent(CardEvents.CardCreated)
  return _id
}

export function getRootType (hierarchy: Hierarchy, type: Ref<MasterTag>): Ref<MasterTag> {
  const ancestors = hierarchy.getAncestors(type)
  const idx = ancestors.indexOf(card.class.Card)

  return idx > 0 ? ancestors[idx - 1] : type
}

export function sortNavigatorTypes (types: MasterTag[], config: NavigatorConfig): MasterTag[] {
  return types.sort((a, b) => {
    const aOrder = config.preorder?.find((it) => it.type === a._id)?.order ?? Infinity
    const bOrder = config.preorder?.find((it) => it.type === b._id)?.order ?? Infinity

    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }

    return a.label.localeCompare(b.label)
  })
}

export async function openCardInSidebar (cardId: Ref<Card>, doc?: Card): Promise<void> {
  const client = getClient()

  const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: card.ids.CardWidget as Ref<Widget> })[0]
  if (widget === undefined) return

  const object = doc ?? (await client.findOne(card.class.Card, { _id: cardId }))
  if (object === undefined) return

  const tab: WidgetTab = {
    id: cardId,
    name: object.title
  }

  createWidgetTab(widget, tab, false)
}

export function cardCustomLinkMatch (doc: Card): boolean {
  const loc = getCurrentResolvedLocation()
  const client = getClient()
  const alias = loc.path[2]
  const app = client.getModel().findAllSync(workbench.class.Application, {
    alias
  })[0]

  return app.type === 'cards'
}

export function cardCustomLinkEncode (doc: Card): Location {
  const loc = getCurrentResolvedLocation()
  loc.path[3] = encodeObjectURI(doc._id, card.class.Card)
  return loc
}

export async function checkRelationsSectionVisibility (doc: Card): Promise<boolean> {
  const client = getClient()
  const h = client.getHierarchy()

  const parents = h.getAncestors(doc._class)
  const mixins = h.findAllMixins(doc)
  const associationsB = client
    .getModel()
    .findAllSync(core.class.Association, { classA: { $in: [...parents, ...mixins] } })
    .filter((a) => a.nameB.trim().length > 0)

  if (associationsB.length > 0) {
    return true
  }

  return (
    client
      .getModel()
      .findAllSync(core.class.Association, { classB: { $in: [...parents, ...mixins] } })
      .filter((a) => a.nameA.trim().length > 0).length > 0
  )
}

export function getCardIconInfo (doc?: Card): { icon: IconComponent, props: IconProps } {
  if (doc === undefined) return { icon: card.icon.Card, props: {} }
  if (doc.icon === view.ids.IconWithEmoji) {
    return { icon: IconWithEmoji, props: { icon: doc.color } }
  }

  if (doc.icon !== undefined) {
    return {
      icon: doc.icon,
      props: {}
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(doc._class) as MasterTag

  return {
    icon: clazz?.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz?.icon ?? card.icon.MasterTag,
    props: clazz?.icon === view.ids.IconWithEmoji ? { icon: clazz.color } : {}
  }
}

export function getAccountClient (): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)

  return getAccountClientRaw(accountsUrl, token)
}

export async function getSpaceAccessPublicLink (doc?: Doc | Doc[]): Promise<string> {
  doc = Array.isArray(doc) ? doc[0] : doc
  if (doc === undefined) {
    return ''
  }

  const accountClient = getAccountClient()
  const navigateUrl = getCurrentLocation()
  navigateUrl.path[2] = cardId
  navigateUrl.path.length = 3
  const accessLink = await accountClient.createAccessLink(AccountRole.Guest, {
    spaces: [doc._id],
    navigateUrl: JSON.stringify(navigateUrl)
  })

  return accessLink
}

export async function canGetSpaceAccessPublicLink (doc?: Doc | Doc[]): Promise<boolean> {
  if (!hasAccountRole(getCurrentAccount(), AccountRole.User)) {
    return false
  }

  return await canCopyLink(doc)
}
