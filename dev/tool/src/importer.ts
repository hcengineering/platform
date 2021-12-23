//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
//

import attachment, { Attachment } from '@anticrm/attachment'
import chunter, { Comment } from '@anticrm/chunter'
import contact, { ChannelProvider } from '@anticrm/contact'
import core, { AttachedData, AttachedDoc, Class, Data, Doc, DocumentUpdate, Ref, SortingOrder, Space, TxOperations, TxResult } from '@anticrm/core'
import recruit from '@anticrm/model-recruit'
import { Applicant, Candidate, Vacancy } from '@anticrm/recruit'
import task, { calcRank, DoneState, genRanks, Kanban, State } from '@anticrm/task'
import { deepEqual } from 'fast-equals'
import { existsSync } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
import mime from 'mime-types'
import { Client } from 'minio'
import { dirname, join } from 'path'
import { parseStringPromise } from 'xml2js'
import { connect } from './connect'
import { ElasticTool } from './elastic'

const _ = {
  candidates: 'Кандидаты',
  candidate: 'Кандидат',

  delete: 'ПометкаУдаления', // -

  id: 'Код', // +
  fullName: 'Наименование', // +
  recruiter: 'Рекрутер',
  birthdate: 'ДатаРождения',
  phone: 'НомерТелефона', // +
  email: 'ЭлектроннаяПочта', // +
  date: 'Дата',

  notifyStatus: 'УведомлятьОСменеСтатуса',

  requiredPosition: 'ЖелаемаяДолжность', // +

  vacancyKind: 'ВидВакансии', // +

  city: 'Проживание', // +
  comment: 'Комментарий', // +

  socialLink: 'СсылкиНаСоцСети', // +
  socialLink2: 'СсылкиНаСоцСети1', // +
  socialLink3: 'СсылкиНаСоцСети2', // +
  otherContact: 'Другие_КонтактыMyMail',
  socialChannel: 'КаналСвязи', // +

  area: 'Отрасль', // +
  area2: 'Отрасль1', // +
  area3: 'Отрасль2', // +
  status: 'Статус',
  socialContacted: 'Откликнулся', // +
  framework: 'ДополнительныйФреймворкТехнологияПлатформаЛибоВторойЯП' // +
}

function get (data: any, key: string): string | undefined {
  const v = data[key]
  if (Array.isArray(v) && v.length === 1) {
    return v[0]
  }
  return v
}

export async function importXml (
  transactorUrl: string,
  dbName: string,
  minio: Client,
  xmlFile: string,
  mongoUrl: string,
  elasticUrl: string
): Promise<void> {
  const connection = await connect(transactorUrl, dbName)

  const tool = new ElasticTool(mongoUrl, dbName, minio, elasticUrl)
  const done = await tool.connect()
  try {
    console.log('loading xml document...')

    const xmlData = await readFile(xmlFile, 'utf-8')
    const data = await parseStringPromise(xmlData)

    const root = dirname(xmlFile)

    const candidates = data[_.candidates][_.candidate]
    console.log('Found candidates:', candidates.length)

    // const attributes = new Set<string>()
    const client = new TxOperations(connection, core.account.System)

    const statuses = candidates.map((c: any) => get(c, _.status)).filter((c: any) => c !== undefined)
      .filter(onlyUniq)

    console.log(statuses)

    const withStatus: {candidateId: Ref<Candidate>, status: string}[] = []
    let pos = 0
    const len = candidates.length as number
    for (const c of candidates) {
      pos++
      const _id = get(c, _.id)
      const _name = get(c, _.fullName)
      if (_name === undefined || _id === undefined) {
        console.log('error procesing', JSON.stringify(c, undefined, 2))
        return
      }
      const candId = `tool-import-${_id}` as Ref<Candidate>
      const _status = get(c, _.status)
      if (_status !== undefined) {
        withStatus.push({ candidateId: candId, status: _status })
      }

      await createCandidate(_name, pos, len, c, client, candId)

      // Check and add attachments.
      const candidateRoot = join(root, _id)

      if (existsSync(candidateRoot)) {
        const files = await readdir(candidateRoot)
        for (const f of files) {
          const attachId = (candId + f.toLowerCase()) as Ref<Attachment>
          const type = mime.contentType(f)
          if (typeof type === 'string') {
            const fileName = join(candidateRoot, f)
            const data = await readFile(fileName)
            try {
              await minio.statObject(dbName, attachId)
            } catch (err: any) {
            // No object, put new one.
              await minio.putObject(dbName, attachId, data, data.length, {
                'Content-Type': type
              })
            }

            const stats = await stat(fileName)

            const attachedDoc = await findOrUpdateAttached<Attachment>(client, recruit.space.CandidatesPublic, attachment.class.Attachment, attachId, {
              name: f,
              file: attachId,
              type: type,
              size: stats.size,
              lastModified: stats.mtime.getTime()
            }, {
              attachedTo: candId,
              attachedClass: recruit.class.Candidate,
              collection: 'attachments'
            })

            await tool.indexAttachmentDoc(attachedDoc, data)
          }
        }
      }
    }

    // Create/Update Vacancy and Applicants.

    if (withStatus.length > 0) {
      const { states, vacancyId } = await createUpdateVacancy(client, statuses)

      // Applicant num sequence.
      const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Applicant })
      if (sequence === undefined) {
        throw new Error('sequence object not found')
      }

      const rankGen = genRanks(withStatus.length)
      const firstState = Array.from(states.values())[0]
      for (const { candidateId, status } of withStatus) {
        const incResult = await client.updateDoc(
          task.class.Sequence,
          task.space.Sequence,
          sequence._id,
          {
            $inc: { sequence: 1 }
          },
          true
        )

        const rank = rankGen.next().value
        const state = states.get(status) ?? firstState

        if (rank === undefined) {
          throw Error('Failed to generate rank')
        }

        const lastOne = await client.findOne(
          recruit.class.Applicant,
          { state },
          { sort: { rank: SortingOrder.Descending } }
        )
        await createApplicant(vacancyId, candidateId, incResult, state, lastOne, client)
      }
    }
  } catch (err: any) {
    console.log(err)
  } finally {
    await done()
    console.log('manual closing connection')
    await connection.close()
  }
}
const onlyUniq = (value: any, index: number, self: any[]): boolean => self.indexOf(value) === index

async function createApplicant (vacancyId: Ref<Vacancy>, candidateId: Ref<Candidate>, incResult: TxResult, state: Ref<State>, lastOne: Applicant | undefined, client: TxOperations): Promise<void> {
  const applicantId = `vacancy-${vacancyId}-${candidateId}` as Ref<Applicant>

  const applicant: AttachedData<Applicant> = {
    number: (incResult as any).object.sequence,
    assignee: null,
    state,
    doneState: null,
    rank: calcRank(lastOne, undefined)
  }

  // Update or create candidate
  await findOrUpdateAttached(client, vacancyId, recruit.class.Applicant, applicantId, applicant, { attachedTo: candidateId, attachedClass: recruit.class.Candidate, collection: 'applications' })
}

async function createUpdateVacancy (client: TxOperations, statuses: any): Promise<{states: Map<string, Ref<State>>, vacancyId: Ref<Vacancy>}> {
  const vacancy: Data<Vacancy> = {
    name: 'Imported Vacancy',
    description: '',
    fullDescription: '',
    location: '',
    company: '',
    members: [],
    archived: false,
    private: false
  }
  const vacancyId = 'imported-vacancy' as Ref<Vacancy>

  console.log('Creating vacancy', vacancy.name)
  // Update or create candidate
  await findOrUpdate(client, core.space.Model, recruit.class.Vacancy, vacancyId, vacancy)

  const states = await createUpdateSpaceKanban(vacancyId, client, statuses)

  console.log('States generated', vacancy.name)
  return { states, vacancyId }
}

async function createCandidate (_name: string, pos: number, len: number, c: any, client: TxOperations, candId: Ref<Candidate>): Promise<void> {
  const names = _name.trim().split(' ')
  console.log(`(${pos} pf ${len})`, names[0] + ',', names.slice(1).join(' '))

  const { sourceFields, telegram, linkedin, github } = parseSocials(c)

  const data: Data<Candidate> = {
    name: names.slice(1).join(' ') + ',' + names[0],
    city: get(c, _.city) ?? '',
    title: [
      get(c, _.vacancyKind),
      get(c, _.area)
    ].filter(p => p !== undefined && p.trim().length > 0).filter(onlyUniq).join('/'),
    source: [
      get(c, _.socialContacted),
      get(c, _.socialChannel),
      sourceFields.filter(onlyUniq).join(', ')
    ].filter(p => p !== undefined && p.trim().length > 0).filter(onlyUniq).join('/'),
    channels: []
  }

  pushChannel(c, data, _.email, contact.channelProvider.Email)
  pushChannel(c, data, _.phone, contact.channelProvider.Phone)

  const commentData: string[] = []

  addComment(commentData, c, _.socialContacted)
  addComment(commentData, c, _.recruiter)
  addComment(commentData, c, _.requiredPosition)
  addComment(commentData, c, _.area2)
  addComment(commentData, c, _.area3)
  addComment(commentData, c, _.framework)
  addComment(commentData, c, _.comment)

  if (telegram !== undefined) {
    data.channels.push({ provider: contact.channelProvider.Telegram, value: telegram })
  }
  if (linkedin !== undefined) {
    data.channels.push({ provider: contact.channelProvider.LinkedIn, value: linkedin })
  }
  if (github !== undefined) {
    data.channels.push({ provider: contact.channelProvider.GitHub, value: github })
  }
  await findOrUpdate(client, recruit.space.CandidatesPublic, recruit.class.Candidate, candId, data)

  const commentId = (candId + '.description.comment') as Ref<Comment>

  if (commentData.length > 0) {
    await findOrUpdateAttached(client, recruit.space.CandidatesPublic, chunter.class.Comment, commentId, {
      message: commentData.join('\n<br/>')
    }, { attachedTo: candId, attachedClass: recruit.class.Candidate, collection: 'comments' })
  }
}

function addComment (data: string[], c: any, key: string): void {
  const val = get(c, key)
  if (val !== undefined) {
    data.push(`${key}: ${val}`.replace('\n', '\n<br/>'))
  }
}

function parseSocials (c: any): { sourceFields: string[], telegram: string | undefined, linkedin: string | undefined, github: string | undefined } {
  let telegram: string | undefined
  let linkedin: string | undefined
  let github: string | undefined

  const sourceFields = ([
    get(c, _.socialLink),
    get(c, _.socialLink2),
    get(c, _.socialLink3),
    get(c, _.otherContact),
    get(c, _.area2),
    get(c, _.area3)
  ].filter(p => p !== undefined && p.trim().length > 0) as string[]).filter(t => {
    const lc = t.toLocaleLowerCase()
    if (lc.startsWith('telegram')) {
      telegram = t.substring(8).replace(':', '').trim()
      return false
    }
    if (lc.includes('linkedin.')) {
      linkedin = t.trim()
      return false
    }
    if (lc.includes('github.com')) {
      github = t.trim()
      return false
    }
    return true
  })
  return { sourceFields, telegram, linkedin, github }
}

function pushChannel (c: any, data: Data<Candidate>, key: string, provider: Ref<ChannelProvider>): void {
  const value = get(c, key)
  if (value !== undefined) {
    data.channels.push({ provider, value })
  }
}
export async function findOrUpdate<T extends Doc> (client: TxOperations, space: Ref<Space>, _class: Ref<Class<T>>, objectId: Ref<T>, data: Data<T>): Promise<void> {
  const existingObj = await client.findOne<Doc>(_class, { _id: objectId, space })
  if (existingObj !== undefined) {
    // Check some field changes
    const { _id, _class, modifiedOn, modifiedBy, space, ...dta } = existingObj
    if (!deepEqual(dta, data)) {
      await client.updateDoc(_class, space, objectId, data)
    }
  } else {
    await client.createDoc(_class, space, data, objectId)
  }
}

function randColor (): string {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

async function createUpdateSpaceKanban (spaceId: Ref<Vacancy>, client: TxOperations, stateNames: string[]): Promise<Map<string, Ref<State>>> {
  const states: Map<string, Ref<State>> = new Map()
  const stateRanks = genRanks(stateNames.length)
  for (const st of stateNames) {
    const rank = stateRanks.next().value

    if (rank === undefined) {
      console.error('Failed to generate rank')
      break
    }

    const sid = ('generated-' + spaceId + '.state.' + st.toLowerCase().replace(' ', '_')) as Ref<State>
    await findOrUpdate(client, spaceId, task.class.State,
      sid,
      {
        title: st,
        color: randColor(),
        rank
      }
    )
    states.set(st, sid)
  }

  const doneStates = [
    { class: task.class.WonState, title: 'Won' },
    { class: task.class.LostState, title: 'Lost' }
  ]
  const doneStateRanks = genRanks(doneStates.length)
  for (const st of doneStates) {
    const rank = doneStateRanks.next().value

    if (rank === undefined) {
      console.error('Failed to generate rank')
      break
    }

    const sid = ('generated-' + spaceId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await findOrUpdate(client, spaceId, st.class,
      sid,
      {
        title: st.title,
        rank
      }
    )
  }

  await findOrUpdate(client, spaceId,
    task.class.Kanban,
    ('generated-' + spaceId + '.kanban') as Ref<Kanban>,
    {
      attachedTo: spaceId
    }
  )
  return states
}
async function findOrUpdateAttached<T extends AttachedDoc> (client: TxOperations, space: Ref<Space>, _class: Ref<Class<T>>, objectId: Ref<T>, data: AttachedData<T>, attached: {attachedTo: Ref<Doc>, attachedClass: Ref<Class<Doc>>, collection: string}): Promise<T> {
  let existingObj = await client.findOne<Doc>(_class, { _id: objectId, space }) as T
  if (existingObj !== undefined) {
    await client.updateCollection(_class, space, objectId, attached.attachedTo, attached.attachedClass, attached.collection, data as unknown as DocumentUpdate<T>)
  } else {
    await client.addCollection(_class, space, attached.attachedTo, attached.attachedClass, attached.collection, data, objectId)
    existingObj = { _id: objectId, _class, space, ...data, ...attached } as unknown as T
  }
  return existingObj
}
