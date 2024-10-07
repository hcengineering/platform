//
// Copyright © 2024 Hardcore Engineering Inc.
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
import documents, {
  documentsId,
  getDocumentId,
  type ControlledDocument,
  type Document,
  type Project,
  type ProjectDocument
} from '@hcengineering/controlled-documents'
import { type Client, type Doc, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { getCurrentResolvedLocation, getPanelURI, type Location, type ResolvedLocation } from '@hcengineering/ui'
import view, { type ObjectPanel } from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import slugify from 'slugify'

export function getPanelFragment<T extends Doc> (object: Pick<T, '_class' | '_id'>): string {
  const hierarchy = getClient().getHierarchy()
  const objectPanelMixin = hierarchy.classHierarchyMixin<Doc, ObjectPanel>(object._class, view.mixin.ObjectPanel)
  const component = objectPanelMixin?.component ?? view.component.EditDoc
  return getPanelURI(component, object._id, object._class, 'content')
}

async function generateDocumentLocation (
  loc: Location,
  document: Ref<ControlledDocument>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const doc = await client.findOne(documents.class.ControlledDocument, { _id: document })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find document ${document}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  return {
    loc: {
      path: [appComponent, workspace, documentsId, doc.space],
      fragment: getPanelFragment(doc)
    },
    defaultLocation: {
      path: [appComponent, workspace, documentsId, 'library'],
      fragment: getPanelFragment(doc)
    }
  }
}

async function generateProjectDocumentLocation (
  loc: Location,
  document: Ref<ControlledDocument>,
  project: Ref<Project>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const doc = await client.findOne(documents.class.ControlledDocument, { _id: document })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find document ${document}.`)
    return undefined
  }

  const prjdoc = await client.findOne(documents.class.ProjectDocument, { document, project })
  if (prjdoc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find project document ${project} ${document}.`)
    return undefined
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  return {
    loc: {
      path: [appComponent, workspace, documentsId, prjdoc.space],
      fragment: getPanelFragment(prjdoc)
    },
    defaultLocation: {
      path: [appComponent, workspace, documentsId, 'library'],
      fragment: getPanelFragment(prjdoc)
    }
  }
}

export function getProjectDocumentLink (doc: Document | Ref<Document>, project: Ref<Project>): Location {
  const loc = getCurrentResolvedLocation()
  loc.fragment = undefined
  loc.query = undefined
  loc.path.length = 2
  loc.path[2] = documentsId
  loc.path[3] = typeof doc === 'string' ? doc : getDocumentLinkId(doc)
  if (project !== documents.ids.NoProject) {
    loc.path[4] = project
  }

  return loc
}

export function getDocumentLink (doc: Document): Location {
  const loc = getCurrentResolvedLocation()
  loc.fragment = undefined
  loc.query = undefined
  loc.path.length = 4
  loc.path[2] = documentsId
  loc.path[3] = getDocumentLinkId(doc)

  return loc
}

function getDocumentLinkId (doc: Document): string {
  const slug = slugify(doc.title, { lower: true })
  return `${slug}---${doc._id}`
}

function parseDocumentId (shortLink?: string): Ref<ControlledDocument> | undefined {
  if (shortLink === undefined) return undefined
  const parts = shortLink.split('---')
  if (parts.length > 1) {
    return parts[parts.length - 1] as Ref<ControlledDocument>
  }
  return shortLink as Ref<ControlledDocument>
}

export function getDocumentIdFromFragment (fragment: string): Ref<ProjectDocument> | undefined {
  const props = decodeURIComponent(fragment).split('|')

  return props[1] != null ? (props[1] as Ref<ProjectDocument>) : undefined
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== documentsId) {
    return undefined
  }

  const shortLink = loc.path[3]
  const id = parseDocumentId(shortLink)
  const projectId = loc.path[4] as Ref<Project>

  if (id !== undefined) {
    return projectId !== undefined
      ? await generateProjectDocumentLocation(loc, id, projectId)
      : await generateDocumentLocation(loc, id)
  }

  return undefined
}

export async function documentIdentifierProvider (client: Client, ref: Ref<Document>, doc?: Document): Promise<string> {
  const document = doc ?? (await client.findOne(documents.class.Document, { _id: ref }))

  if (document === undefined) {
    return ''
  }

  return getDocumentId(document)
}
