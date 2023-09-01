import contact, { getName } from '@hcengineering/contact'
import { Class, Client, Doc, Hierarchy, Ref } from '@hcengineering/core'
import presentation, { getClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { Applicant, Candidate, Review, Vacancy, VacancyList, recruitId } from '@hcengineering/recruit'
import { Location, ResolvedLocation, getCurrentResolvedLocation, getPanelURI } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import recruit from './plugin'

type RecruitDocument = Vacancy | Applicant | Review

export async function objectLinkProvider (doc: RecruitDocument): Promise<string> {
  const location = getCurrentResolvedLocation()
  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  const url = `${frontUrl}/${workbenchId}/${location.path[1]}/${recruitId}/${await getSequenceId(doc)}`
  return url
}

function isShortId (shortLink: string): boolean {
  return /^\S+-\d+$/.test(shortLink)
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== recruitId) {
    return undefined
  }

  const shortLink = loc.path[3]

  // shortlink
  if (isShortId(shortLink)) {
    return await generateLocation(loc, shortLink)
  } else if (shortLink !== undefined) {
    return await generateIdLocation(loc, shortLink)
  }
}

async function generateIdLocation (loc: Location, shortLink: string): Promise<ResolvedLocation | undefined> {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classLabel = tokens[0]
  const _id = tokens.slice(1).join('-')
  const classes = [recruit.mixin.VacancyList, recruit.mixin.Candidate]
  let _class: Ref<Class<Doc>> | undefined
  for (const clazz of classes) {
    if (hierarchy.getClass(clazz).shortLabel === classLabel) {
      _class = clazz
      break
    }
  }
  if (_class === undefined) {
    console.error(`Not found class with short label ${classLabel}`)
    return undefined
  }
  const doc = await client.findOne(_class, { _id: _id as Ref<Doc> })
  if (doc === undefined) {
    console.error(`Could not find ${_class} with id ${_id}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const objectPanel = hierarchy.classHierarchyMixin(recruit.mixin.Candidate as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc
  const special = _class === recruit.mixin.Candidate ? 'talents' : 'organizations'
  const defaultPath = [appComponent, workspace, recruitId, special]

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, _class, 'content')
    },
    defaultLocation: {
      path: defaultPath,
      fragment: getPanelURI(component, doc._id, _class, 'content')
    }
  }
}

async function generateLocation (loc: Location, shortLink: string): Promise<ResolvedLocation | undefined> {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const classLabel = tokens[0]
  const number = Number(tokens[1])
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const classes = [recruit.class.Applicant, recruit.class.Vacancy, recruit.class.Review]
  let _class: Ref<Class<Doc>> | undefined
  for (const clazz of classes) {
    if (hierarchy.getClass(clazz).shortLabel === classLabel) {
      _class = clazz
      break
    }
  }
  if (_class === undefined) {
    console.error(`Not found class with short label ${classLabel}`)
    return undefined
  }
  const doc = await client.findOne(_class, { number })
  if (doc === undefined) {
    console.error(`Could not find ${_class} with number ${number}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const objectPanel = hierarchy.classHierarchyMixin(_class, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc
  const defaultPath = [appComponent, workspace, recruitId]
  if (_class === recruit.class.Vacancy) {
    defaultPath.push('vacancies')
  } else if (_class === recruit.class.Applicant) {
    defaultPath.push('candidates')
  }
  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: defaultPath,
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export async function getSequenceLink (doc: RecruitDocument): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = recruitId
  loc.path[3] = await getSequenceId(doc)

  return loc
}

export async function getObjectLink (doc: Candidate | VacancyList): Promise<Location> {
  const _class = Hierarchy.mixinOrClass(doc)
  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = recruitId
  loc.path[3] = clazz.shortLabel !== undefined ? `${clazz.shortLabel}-${doc._id}` : doc._id

  return loc
}

async function getTitle<T extends RecruitDocument> (
  client: Client,
  ref: Ref<T>,
  _class: Ref<Class<T>>
): Promise<string> {
  const object = await client.findOne<RecruitDocument>(_class, { _id: ref as Ref<any> })
  return object != null ? await getSequenceId(object) : ''
}

export async function getVacTitle (client: Client, ref: Ref<Vacancy>): Promise<string> {
  const object = await client.findOne(recruit.class.Vacancy, { _id: ref })
  return object != null ? object.name : ''
}

export async function getAppTitle (client: Client, ref: Ref<Applicant>): Promise<string> {
  const applicant = await client.findOne(recruit.class.Applicant, { _id: ref })
  if (applicant === undefined) return ''
  const candidate = await client.findOne(contact.class.Contact, { _id: applicant.attachedTo })
  if (candidate === undefined) return ''
  return getName(client.getHierarchy(), candidate)
}

export async function getRevTitle (client: Client, ref: Ref<Review>): Promise<string> {
  return await getTitle(client, ref, recruit.class.Review)
}

export async function getSequenceId (doc: RecruitDocument): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  let clazz = hierarchy.getClass(doc._class)
  let label = clazz.shortLabel
  while (label === undefined && clazz.extends !== undefined) {
    clazz = hierarchy.getClass(clazz.extends)
    label = clazz.shortLabel
  }

  return label !== undefined ? `${label}-${doc.number}` : doc.number.toString()
}

export async function getTalentId (doc: Candidate): Promise<string> {
  return doc._id
}
