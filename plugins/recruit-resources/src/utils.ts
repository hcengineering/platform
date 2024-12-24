import contact, { getName } from '@hcengineering/contact'
import { Hierarchy, type Class, type Client, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import {
  recruitId,
  type Applicant,
  type Candidate,
  type Review,
  type Vacancy,
  type VacancyList
} from '@hcengineering/recruit'
import { type Poll } from '@hcengineering/survey'
import { generatePollLocation } from '@hcengineering/survey-resources'
import { getCurrentResolvedLocation, getPanelURI, type Location, type ResolvedLocation } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import { workbenchId } from '@hcengineering/workbench'
import recruit from './plugin'

type RecruitDocument = Vacancy | Applicant | Review

const CANDIDATES_ID = 'candidates'

export async function objectLinkProvider (doc: RecruitDocument): Promise<string> {
  const location = getCurrentResolvedLocation()
  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  const url = `${frontUrl}/${workbenchId}/${location.path[1]}/${recruitId}/${getSequenceId(doc)}`
  return url
}

function isShortId (shortLink: string): boolean {
  return /^\w+-\d+$/.test(shortLink)
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== recruitId) {
    return undefined
  }

  if (loc.path[3] === 'poll') {
    return await generatePollLocation(loc, loc.path[4] as Ref<Poll>)
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
    accessDeniedStore.set(true)
    console.error(`Could not find ${_class} with id ${_id}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const objectPanel = hierarchy.classHierarchyMixin(Hierarchy.mixinOrClass(doc), view.mixin.ObjectPanel)

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

export async function parseLinkId (id: string): Promise<Ref<Doc> | undefined> {
  if (isShortId(id)) {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const data = getShortLinkData(hierarchy, id)

    if (data === undefined) {
      return id as Ref<Doc>
    }

    const [_class, , number] = data

    if (_class === undefined) {
      return id as Ref<Doc>
    }

    const doc = await client.findOne(_class, { number }, { projection: { _id: 1 } })

    return doc?._id
  }

  return id as Ref<Doc>
}

export function getApplicantsLink (_id: Ref<VacancyList>): Location {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 4
  loc.fragment = undefined
  loc.query = undefined
  loc.path[3] = CANDIDATES_ID
  const isAllCompanies = _id === undefined || _id === recruit.ids.AllCompanies
  loc.query = isAllCompanies ? undefined : { ...(loc?.query ?? {}), company: _id }

  return loc
}

export async function isApplicationsSpecial (): Promise<boolean> {
  const loc = getCurrentResolvedLocation()
  return loc.path[3] === CANDIDATES_ID
}

function getShortLinkData (
  hierarchy: Hierarchy,
  shortLink: string
): [Ref<Class<Doc>> | undefined, string, number] | undefined {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const classLabel = tokens[0]
  const number = Number(tokens[1])

  const classes = [recruit.class.Applicant, recruit.class.Vacancy, recruit.class.Review]
  let _class: Ref<Class<Doc>> | undefined
  for (const clazz of classes) {
    if (hierarchy.getClass(clazz).shortLabel === classLabel) {
      _class = clazz
      break
    }
  }

  return [_class, classLabel, number]
}

async function generateLocation (loc: Location, shortLink: string): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const data = getShortLinkData(hierarchy, shortLink)

  if (data === undefined) {
    return
  }

  const [_class, classLabel, number] = data

  if (_class === undefined) {
    console.error(`Not found class with short label ${classLabel}`)
    return undefined
  }
  const doc = await client.findOne(_class, { number })
  if (doc === undefined) {
    accessDeniedStore.set(true)
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
    defaultPath.push(CANDIDATES_ID)
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
  loc.path[3] = getSequenceId(doc)

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

export async function getVacTitle (client: Client, ref: Ref<Vacancy>, doc?: Vacancy): Promise<string> {
  const object = doc ?? (await client.findOne(recruit.class.Vacancy, { _id: ref }))
  return object != null ? object.name : ''
}

export async function getAppTitle (client: Client, ref: Ref<Applicant>, doc?: Applicant): Promise<string> {
  const applicant = doc ?? (await client.findOne(recruit.class.Applicant, { _id: ref }))
  if (applicant === undefined) return ''
  const candidate = await client.findOne(contact.class.Contact, { _id: applicant.attachedTo })
  if (candidate === undefined) return ''
  return getName(client.getHierarchy(), candidate)
}

export function getCandidateIdentifier (ref: Ref<Candidate>): string {
  const hierarchy = getClient().getHierarchy()
  const clazz = hierarchy.getClass(recruit.mixin.Candidate)
  return clazz.shortLabel !== undefined ? `${clazz.shortLabel}-${ref}` : ref
}

export async function getAppIdentifier (client: Client, ref: Ref<Applicant>, doc?: Applicant): Promise<string> {
  const applicant = doc ?? (await client.findOne(recruit.class.Applicant, { _id: ref }))

  if (applicant === undefined) {
    return ''
  }

  return applicant.identifier
}

export async function getRevTitle (client: Client, ref: Ref<Review>, doc?: Review): Promise<string> {
  const object = doc ?? (await client.findOne(recruit.class.Review, { _id: ref }))
  return object != null ? object.title : ''
}

export function getSequenceId (doc: RecruitDocument): string {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(doc._class, recruit.class.Applicant)) {
    return (doc as Applicant).identifier
  }
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

export async function getVacancyIdentifier (client: Client, ref: Ref<Vacancy>, doc?: Vacancy): Promise<string> {
  const vacancy = doc ?? (await client.findOne(recruit.class.Vacancy, { _id: ref }))

  if (vacancy === undefined) {
    return ''
  }

  return getSequenceId(vacancy)
}

export async function getReviewIdentifier (client: Client, ref: Ref<Review>, doc?: Review): Promise<string> {
  const review = doc ?? (await client.findOne(recruit.class.Review, { _id: ref }))

  if (review === undefined) {
    return ''
  }

  return getSequenceId(review)
}
