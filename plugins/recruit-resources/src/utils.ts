import { Class, Client, Doc, Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { Applicant, recruitId, Review, Vacancy } from '@hcengineering/recruit'
import { getCurrentLocation, getPanelURI, Location } from '@hcengineering/ui'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import recruit from './plugin'

type RecruitDocument = Vacancy | Applicant | Review

export async function objectLinkProvider (doc: RecruitDocument): Promise<string> {
  const location = getCurrentLocation()
  return await Promise.resolve(
    `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}#${await getSequenceLink(
      doc
    )}`
  )
}

function isShortId (shortLink: string): boolean {
  return /^\w+-\d+$/.test(shortLink)
}

export async function resolveLocation (loc: Location): Promise<Location | undefined> {
  const split = loc.fragment?.split('|') ?? []
  if (split[0] !== recruitId) {
    return undefined
  }

  const shortLink = split[1]

  // shortlink
  if (isShortId(shortLink)) {
    return await generateLocation(loc, shortLink)
  }

  return undefined
}

async function generateLocation (loc: Location, shortLink: string): Promise<Location | undefined> {
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
  const targetClass = hierarchy.getClass(_class)
  const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
  const component = panelComponent.component ?? view.component.EditDoc
  return {
    path: [appComponent, workspace, recruitId],
    fragment: getPanelURI(component, doc._id, doc._class, 'content')
  }
}

export async function getSequenceLink (doc: RecruitDocument): Promise<string> {
  return `${recruitId}|${await getSequenceId(doc)}`
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
  return await getTitle(client, ref, recruit.class.Applicant)
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
