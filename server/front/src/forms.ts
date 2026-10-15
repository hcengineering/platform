//
// Copyright © 2026 TraceX SAS.
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

import { getClient as getAccountClient } from '@hcengineering/account-client'
import card, { type Card, type CardSpace, type MasterTag } from '@hcengineering/card'
import { getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import core, {
  type AnyAttribute,
  type AccountUuid,
  type ArrOf,
  type Class,
  type Client,
  type Data,
  type Doc,
  type EnumOf,
  type Hierarchy,
  type Markup,
  type MarkupBlobRef,
  type MeasureContext,
  type PersonId,
  type Person,
  type PropertyType,
  type Ref,
  type RefTo,
  type SocialId,
  type Type,
  type WorkspaceUuid,
  DOMAIN_MODEL,
  SocialIdType,
  TxOperations,
  fillDefaults,
  isId,
  makeCollabId,
  systemAccountUuid
} from '@hcengineering/core'
import forms, {
  isFormInputField,
  type FormSchema,
  type FormConfiguration,
  type FormField,
  type FormSubmissionResult
} from '@hcengineering/forms'
import guest, { guestAccount, type PublicLink } from '@hcengineering/guest'
import { createClient } from '@hcengineering/server-client'
import platform, { PlatformError } from '@hcengineering/platform'
import { decodeToken, generateToken } from '@hcengineering/server-token'
import view from '@hcengineering/view'
import type { Express, Request, Response } from 'express'
import { createHash } from 'node:crypto'
import { validate as isUuid } from 'uuid'
import { FormError, isRecord, validateFields } from './forms-validation'
import { ensureFormAuthor } from './forms-author'
import { compatibleFormSpaces, canCreateFormCard } from './forms-space'

interface FormsConfig {
  accountsUrl: string
  collaboratorUrl: string
}

interface Identity {
  account: AccountUuid
  socialId: PersonId
  social: SocialId
  person: Person
  name: string
  token: string
}

const RESERVED_FIELDS = new Set([
  'space',
  'rank',
  'blobs',
  'parentInfo',
  'readonly',
  'readonlyFields',
  'readonlySections',
  'peerId',
  'createdBy',
  'modifiedBy',
  'createdOn',
  'modifiedOn',
  'constructor',
  'prototype'
])

function containsIdentifier (hierarchy: Hierarchy, type: Type<PropertyType>): boolean {
  if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
    return containsIdentifier(hierarchy, (type as ArrOf<PropertyType>).of)
  }
  return hierarchy.isDerived(type._class, core.class.TypeIdentifier)
}

function visibleAttributes (hierarchy: Hierarchy, type: Ref<MasterTag>): [string, AnyAttribute][] {
  return [...hierarchy.getAllAttributes(type, core.class.Doc)]
    .filter(
      ([name, attr]) =>
        /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) &&
        !RESERVED_FIELDS.has(name) &&
        attr.hidden !== true &&
        (name === 'title' || attr.showInForm === true) &&
        attr.readonly !== true &&
        attr.automationOnly !== true &&
        !containsIdentifier(hierarchy, attr.type) &&
        !hierarchy.isDerived(attr.type._class, core.class.Collection)
    )
    .sort((a, b) => {
      if (a[0] === b[0]) return 0
      if (a[0] === 'title') return -1
      if (b[0] === 'title') return 1
      return (a[1].rank ?? a[1]._id).localeCompare(b[1].rank ?? b[1]._id)
    })
}

function fieldForType (client: Client, name: string, attr: AnyAttribute, type = attr.type): FormField {
  const hierarchy = client.getHierarchy()
  const field: FormField = {
    name,
    label: attr.label,
    kind: 'text',
    required: attr.required === true || name === 'title',
    defaultValue: attr.defaultValue
  }
  const derived = (clazz: Ref<Class<Doc>>): boolean => hierarchy.isDerived(type._class, clazz)
  if (derived(core.class.TypeBoolean)) field.kind = 'boolean'
  else if (derived(core.class.TypeNumber)) field.kind = 'number'
  else if (derived(core.class.TypeTimestamp) || derived(core.class.TypeDate)) field.kind = 'date'
  else if (derived(core.class.TypeCollaborativeDoc) || derived(core.class.TypeMarkup)) field.kind = 'markup'
  else if (derived(core.class.EnumOf)) {
    field.kind = 'enum'
    field.values = client.getModel().findObject((type as unknown as EnumOf).of)?.enumValues ?? []
  } else if (derived(core.class.RefTo)) {
    field.kind = 'reference'
    // Reference values are never enumerated publicly.
    delete field.defaultValue
  } else if (derived(core.class.ArrOf)) {
    field.kind = 'array'
    field.item = fieldForType(
      client,
      name,
      { ...attr, defaultValue: undefined },
      (type as unknown as ArrOf<PropertyType>).of
    )
    delete field.defaultValue
  } else if (derived(core.class.TypeAny) || derived(core.class.TypeRecord) || derived(core.class.TypeRelatedDocument)) {
    field.kind = 'json'
    delete field.defaultValue
  }
  return field
}

function isMasterTag (type: Class<Doc> | undefined): type is MasterTag {
  return type !== undefined && type._class === card.class.MasterTag
}

async function getConfiguration (
  client: Client,
  _id: string
): Promise<{ configuration: FormConfiguration, type: MasterTag }> {
  const hierarchy = client.getHierarchy()
  const configuration = await client.findOne(forms.class.FormConfiguration, {
    _id: _id as Ref<FormConfiguration>,
    enabled: true
  })
  if (configuration === undefined) {
    throw new FormError(404, 'unavailable')
  }
  const type = hierarchy.findClass(configuration.masterTag)
  if (!isMasterTag(type)) {
    throw new FormError(404, 'unavailable')
  }

  const isActiveCardType =
    type.removed !== true && !hierarchy.isMixin(type._id) && hierarchy.isDerived(type._id, card.class.Card)
  if (!isActiveCardType) {
    throw new FormError(404, 'unavailable')
  }

  if (type.baseType === true) {
    const hasActiveDescendants = hierarchy.getDescendants(type._id).some((descendant) => {
      if (descendant === type._id || hierarchy.isMixin(descendant)) return false
      const descendantType = hierarchy.getClass(descendant) as MasterTag
      return descendantType.removed !== true
    })
    if (hasActiveDescendants) {
      throw new FormError(404, 'unavailable')
    }
  }

  const mode = configuration.mode ?? 'public'
  const validMode = ['public', 'private-fixed', 'private-auto'].includes(mode)
  const hasDestination = mode === 'private-auto' || configuration.targetSpace !== undefined
  if (!validMode || !hasDestination) throw new FormError(404, 'unavailable')
  return { configuration, type }
}

function getSchema (client: Client, type: MasterTag, configuration: FormConfiguration): FormSchema {
  return {
    id: configuration._id,
    mode: configuration.mode ?? 'public',
    label: type.label,
    description: type.description,
    fields: visibleAttributes(client.getHierarchy(), type._id)
      .map(([name, attr]) => fieldForType(client, name, attr))
      .filter(isFormInputField)
  }
}

async function verifyReferences (
  client: Client,
  type: Type<PropertyType>,
  value: unknown,
  space: Ref<CardSpace>
): Promise<void> {
  if (value === undefined || value === null || value === '') return
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
    for (const item of value as unknown[]) {
      await verifyReferences(client, (type as unknown as ArrOf<PropertyType>).of, item, space)
    }
  } else if (hierarchy.isDerived(type._class, core.class.RefTo)) {
    const target = (type as unknown as RefTo<Doc>).to
    const referenced = await client.findOne(target, { _id: value })
    if (referenced === undefined || (hierarchy.getDomain(target) !== DOMAIN_MODEL && referenced.space !== space)) {
      throw new FormError(400, 'invalid_field')
    }
  }
}

async function getIdentity (req: Request, accountsUrl: string): Promise<Identity> {
  const auth = req.header('authorization')
  if (auth === undefined || !auth.startsWith('Bearer ')) throw new FormError(401, 'unauthorized')
  const token = auth.slice(7)
  const decoded = decodeToken(token)
  if (
    decoded.account === systemAccountUuid ||
    decoded.account === guestAccount ||
    decoded.grant !== undefined ||
    decoded.extra?.guest === 'true' ||
    decoded.extra?.service !== undefined
  ) {
    throw new FormError(401, 'unauthorized')
  }
  const accountClient = getAccountClient(accountsUrl, token)
  const login = await accountClient.getLoginInfoByToken()
  if (
    login === null ||
    !('account' in login) ||
    login.tfaRequired === true ||
    (await accountClient.isReadOnlyGuest())
  ) {
    throw new FormError(401, 'unauthorized')
  }
  const socialIds = await accountClient.getSocialIds()
  const socialId =
    socialIds.find(
      (social) => social.type === SocialIdType.EMAIL && social.verifiedOn !== undefined && social.isDeleted !== true
    ) ?? socialIds.find((social) => social.verifiedOn !== undefined && social.isDeleted !== true)
  if (socialId === undefined) throw new FormError(401, 'unauthorized')
  const person = await accountClient.getPerson()
  return {
    account: login.account,
    socialId: socialId._id,
    social: socialId,
    person,
    name: `${person.firstName} ${person.lastName ?? ''}`.trim(),
    token
  }
}

function plainMarkup (text: string): Markup {
  return JSON.stringify({
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line === '' ? [] : [{ type: 'text', text: line }]
    }))
  })
}

async function submit (
  client: Client,
  writer: Client,
  configuration: FormConfiguration,
  type: MasterTag,
  space: CardSpace,
  req: Request,
  identity: Identity,
  workspace: WorkspaceUuid,
  token: string,
  workspaceUrl: string,
  collaboratorUrl: string
): Promise<FormSubmissionResult> {
  if (
    !isRecord(req.body) ||
    typeof req.body.requestId !== 'string' ||
    (!isId(req.body.requestId) && !isUuid(req.body.requestId))
  ) {
    throw new FormError(400, 'invalid_field')
  }
  const schema = getSchema(client, type, configuration)
  const fields = validateFields(schema.fields, req.body.fields)
  const title = fields.title ?? schema.fields.find((field) => field.name === 'title')?.defaultValue
  if (typeof title !== 'string' || title.trim() === '') throw new FormError(400, 'required')
  const hash = createHash('sha256')
    .update(JSON.stringify([workspace, configuration._id, space._id, identity.socialId, req.body.requestId, fields]))
    .digest('hex')
  const id = `forms-${hash}` as Ref<Card>
  const linkId = `forms-link-${hash}` as Ref<PublicLink>
  const current = await client.findOne(type._id, { _id: id })
  if (current === undefined) {
    for (const [name, attr] of visibleAttributes(client.getHierarchy(), type._id)) {
      await verifyReferences(client, attr.type, fields[name], space._id)
      if (
        fields[name] !== undefined &&
        (client.getHierarchy().isDerived(attr.type._class, core.class.TypeMarkup) ||
          client.getHierarchy().isDerived(attr.type._class, core.class.TypeCollaborativeDoc))
      ) {
        const markup = plainMarkup(fields[name] as string)
        fields[name] = client.getHierarchy().isDerived(attr.type._class, core.class.TypeCollaborativeDoc)
          ? await getCollaboratorClient(workspace, token, collaboratorUrl).createMarkup(
              makeCollabId(type._id, id, name),
              markup
            )
          : markup
      }
    }
    const data = fillDefaults(
      client.getHierarchy(),
      {
        parentInfo: [],
        blobs: {},
        rank: '',
        content: '' as MarkupBlobRef,
        ...fields,
        title: title.trim()
      },
      type._id
    ) as Data<Card>
    if (typeof fields.parent === 'string') {
      const parent = await client.findOne(card.class.Card, { _id: fields.parent as Ref<Card>, space: space._id })
      if (parent === undefined) throw new FormError(400, 'invalid_field')
      data.parentInfo = [...(parent.parentInfo ?? []), { _id: parent._id, _class: parent._class, title: parent.title }]
    }
    await ensureFormAuthor(client, identity.person, identity.social)
    if (writer !== client && !canCreateFormCard(writer, space, type, identity.account, identity.socialId, data)) {
      throw new FormError(403, 'access_denied')
    }
    const ops = new TxOperations(writer, identity.socialId).apply(id)
    ops.notMatch(type._id, { _id: id })
    ops.match(forms.class.FormConfiguration, {
      _id: configuration._id,
      enabled: true,
      masterTag: type._id,
      mode: configuration.mode ?? { $exists: false },
      targetSpace: configuration.targetSpace ?? { $exists: false }
    })
    await ops.createDoc(type._id, space._id, data, id)
    const panel =
      client.getHierarchy().classHierarchyMixin(type._id, view.mixin.ObjectPanel)?.component ?? view.component.EditDoc
    await ops.createDoc(
      guest.class.PublicLink,
      core.space.Workspace,
      {
        attachedTo: id,
        location: { path: [], fragment: encodeURIComponent([panel, id, type._id, 'content'].join('|')) },
        revokable: true,
        restrictions: { readonly: true, disableNavigation: true, disableActions: true, disableComments: true },
        url: ''
      },
      linkId
    )
    const result = await ops.commit()
    if (!result.result && (await client.findOne(type._id, { _id: id })) === undefined) {
      throw new FormError(409, 'unavailable')
    }
  }
  const link = await client.findOne(guest.class.PublicLink, { _id: linkId, attachedTo: id })
  if (link === undefined) throw new FormError(409, 'unavailable')
  // Match the existing guest link format, with a token restricted to this PublicLink.
  const guestToken = generateToken(guestAccount, workspace, { guest: 'true', linkId, service: '' })
  return { id, url: link.url || `/guest/${encodeURIComponent(workspaceUrl)}?token=${encodeURIComponent(guestToken)}` }
}

/** Installs public schema and authenticated submission endpoints for Forms. */
export function registerFormsRoutes (app: Express, ctx: MeasureContext, config: FormsConfig): void {
  const limits = new Map<string, { count: number, expires: number }>()
  function allow (req: Request): boolean {
    const now = Date.now()
    for (const [key, value] of limits) if (value.expires <= now) limits.delete(key)
    const key = `${req.ip}:${req.method}`
    const entry = limits.get(key) ?? { count: 0, expires: now + 60000 }
    if (limits.size >= 10000 && !limits.has(key)) return false
    entry.count++
    limits.set(key, entry)
    return entry.count <= (req.method === 'POST' ? 10 : 60)
  }
  function failure (res: Response, error: unknown): void {
    if (error instanceof PlatformError && error.status.code === platform.status.Forbidden) {
      res.status(403).json({ error: 'access_denied' })
    } else if (error instanceof FormError) {
      res.status(error.status).json({ error: error.code })
    } else {
      ctx.error('Forms request failed', { error })
      res.status(503).json({ error: 'unavailable' })
    }
  }
  app.get('/api/forms/identity', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    void getIdentity(req, config.accountsUrl)
      .then(({ name }) => res.json({ name }))
      .catch((error) => {
        failure(res, error)
      })
  })
  const handler = (req: Request, res: Response): void => {
    res.setHeader('Cache-Control', 'no-store')
    if (!allow(req)) {
      res.status(429).json({ error: 'rate_limit' })
      return
    }
    void (async () => {
      if (req.params.workspace === '') throw new FormError(404, 'unavailable')
      let identity = req.method === 'POST' ? await getIdentity(req, config.accountsUrl) : undefined
      const legacyWorkspace = isUuid(req.params.workspace) ? (req.params.workspace as WorkspaceUuid) : undefined
      const lookupToken = generateToken(systemAccountUuid, legacyWorkspace, { service: 'front' }, undefined, {
        exp: Math.floor(Date.now() / 1000) + 300
      })
      const accountClient = getAccountClient(config.accountsUrl, lookupToken)
      const login = await accountClient.selectWorkspace(
        legacyWorkspace === undefined ? req.params.workspace : '',
        'internal'
      )
      const workspace = login.workspace
      const token = login.token
      const client = await createClient(login.endpoint, token, undefined, 10000)
      let writer = client
      try {
        const { configuration, type } = await getConfiguration(client, req.params.form)
        const privateForm = configuration.mode !== undefined && configuration.mode !== 'public'
        if (privateForm) {
          if (identity === undefined) {
            if (req.header('authorization') === undefined) throw new FormError(401, 'private_required')
            identity = await getIdentity(req, config.accountsUrl)
          }
          const userAccounts = getAccountClient(config.accountsUrl, identity.token)
          const memberships = await userAccounts.getUserWorkspaces()
          if (!memberships.some((member) => member.uuid === workspace && member.isDisabled !== true)) {
            throw new FormError(403, 'access_denied')
          }
          const member = await userAccounts.selectWorkspace(login.workspaceUrl, 'internal')
          if (member.workspace !== workspace) throw new FormError(403, 'access_denied')
          writer = await createClient(member.endpoint, member.token, undefined, 10000)
        }
        const candidates = compatibleFormSpaces(
          writer,
          type,
          await writer.findAll(
            card.class.CardSpace,
            {
              archived: false,
              ...(configuration.mode === 'private-auto' ? {} : { _id: configuration.targetSpace })
            },
            { sort: { _id: 1 } }
          )
        )
        const schema = getSchema(client, type, configuration)
        const values = req.method === 'POST' ? validateFields(schema.fields, req.body?.fields) : undefined
        const creationData =
          values === undefined
            ? undefined
            : (fillDefaults(
                writer.getHierarchy(),
                {
                  parentInfo: [],
                  blobs: {},
                  rank: '',
                  content: '' as MarkupBlobRef,
                  ...values,
                  title: values.title ?? schema.fields.find((field) => field.name === 'title')?.defaultValue ?? ''
                },
                type._id
              ) as Data<Card>)
        const space = candidates.find(
          (space) =>
            !privateForm ||
            (identity !== undefined &&
              canCreateFormCard(writer, space, type, identity.account, identity.socialId, creationData))
        )
        if (space === undefined) {
          throw new FormError(privateForm ? 403 : 404, privateForm ? 'access_denied' : 'unavailable')
        }
        if (req.method === 'POST' && identity !== undefined) {
          res.json(
            await submit(
              client,
              writer,
              configuration,
              type,
              space,
              req,
              identity,
              workspace,
              token,
              login.workspaceUrl,
              config.collaboratorUrl
            )
          )
        } else res.json(schema)
      } finally {
        try {
          if (writer !== client) await writer.close()
        } finally {
          await client.close()
        }
      }
    })().catch((error) => {
      failure(res, error)
    })
  }
  app.get('/api/forms/:workspace/:form', handler)
  app.post('/api/forms/:workspace/:form', handler)
}
