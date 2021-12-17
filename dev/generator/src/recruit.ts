import contact from '@anticrm/contact'
import core, { AttachedData, Data, generateId, genRanks, Ref, TxOperations } from '@anticrm/core'
import recruit from '@anticrm/model-recruit'
import { Applicant, Candidate, Vacancy } from '@anticrm/recruit'
import faker from 'faker'
import jpeg, { BufferRet } from 'jpeg-js'
import { Client } from 'minio'
import { addAttachments, AttachmentOptions } from './attachments'
import { addComments, CommentOptions } from './comments'
import { connect } from './connect'
import { createUpdateSpaceKanban } from './kanban'
import { findOrUpdate, findOrUpdateAttached } from './utils'

export interface RecruitOptions {
  random: boolean // random id prefix.
  contacts: number // how many contacts to add
  vacancy: number // Will add number of vacancies with applications.
  // Comment generation control
  comments: CommentOptions
  // Attachment generation control
  attachments: AttachmentOptions

  applicantUpdateFactor: number
}

export async function generateContacts (transactorUrl: string, dbName: string, options: RecruitOptions, minio: Client): Promise<void> {
  const connection = await connect(transactorUrl, dbName)

  const accounts = await connection.findAll(contact.class.EmployeeAccount, {})
  const accountIds = accounts.map(a => a._id)
  const emoloyeeIds = accounts.map(a => a.employee)

  const account = faker.random.arrayElement(accounts)

  const client = new TxOperations(connection, account._id)

  const candidates: Ref<Candidate>[] = []

  for (let i = 0; i < options.contacts; i++) {
    const fName = faker.name.firstName()
    const lName = faker.name.lastName()

    const { imgId, jpegImageData } = generateAvatar(i)
    await minio.putObject(dbName, imgId, jpegImageData.data, jpegImageData.data.length, { 'Content-Type': 'image/jpeg' })
    const candidate: Data<Candidate> = {
      name: fName + ',' + lName,
      city: faker.address.city(),
      title: faker.name.title(),
      channels: [
        { provider: contact.channelProvider.Email, value: faker.internet.email(fName, lName) }
      ],
      onsite: faker.datatype.boolean(),
      remote: faker.datatype.boolean(),
      avatar: imgId,
      source: faker.lorem.lines(1)
    }
    const candidateId = (options.random ? `candidate-${generateId()}-${i}` : `candidate-genid-${i}`) as Ref<Candidate>
    candidates.push(candidateId)

    // Update or create candidate
    await findOrUpdate(client, recruit.space.CandidatesPublic, recruit.class.Candidate, candidateId, candidate)

    await addComments(options.comments, client, recruit.space.CandidatesPublic, candidateId, recruit.class.Candidate, 'comments')

    await addAttachments(options.attachments, client, minio, dbName, recruit.space.CandidatesPublic, candidateId, recruit.class.Candidate, 'attachments')

    console.log('Candidate', fName, lName, ' generated')
  }
  // Work on Vacancy/Applications.
  for (let i = 0; i < options.vacancy; i++) {
    const vacancy: Data<Vacancy> = {
      name: faker.company.companyName(),
      description: faker.lorem.sentences(2),
      fullDescription: faker.lorem.sentences(10),
      location: faker.address.city(),
      company: faker.company.companyName(),
      members: accountIds,
      private: false
    }
    const vacancyId = (options.random ? `vacancy-${generateId()}-${i}` : `vacancy-genid-${i}`) as Ref<Vacancy>

    console.log('Creating vacancy', vacancy.name)
    // Update or create candidate
    await findOrUpdate(client, core.space.Model, recruit.class.Vacancy, vacancyId, vacancy)

    console.log('Vacandy generated', vacancy.name)

    await addAttachments(options.attachments, client, minio, dbName, vacancyId, vacancyId, recruit.class.Vacancy, 'attachments')

    console.log('Vacandy attachments generated', vacancy.name)

    const states = await createUpdateSpaceKanban(vacancyId, client)

    console.log('States generated', vacancy.name)

    const rankGen = genRanks(candidates.length)
    for (const candidateId of candidates) {
      const rank = rankGen.next().value

      if (rank === undefined) {
        throw Error('Failed to generate rank')
      }

      const applicantId = `vacancy-${vacancyId}-${candidateId}` as Ref<Applicant>

      const applicant: AttachedData<Applicant> = {
        number: faker.datatype.number(),
        assignee: faker.random.arrayElement(emoloyeeIds),
        state: faker.random.arrayElement(states),
        doneState: null,
        rank
      }

      // Update or create candidate
      await findOrUpdateAttached(client, vacancyId, recruit.class.Applicant, applicantId, applicant, { attachedTo: candidateId, attachedClass: recruit.class.Candidate, collection: 'applications' })

      await addComments(options.comments, client, vacancyId, applicantId, recruit.class.Vacancy, 'comments')

      await addAttachments(options.attachments, client, minio, dbName, vacancyId, applicantId, recruit.class.Applicant, 'attachments')

      if (faker.datatype.number(100) > options.applicantUpdateFactor) {
        await client.updateCollection(recruit.class.Applicant, vacancyId, applicantId, candidateId, recruit.class.Applicant, 'applications', {
          state: faker.random.arrayElement(states)
        })
      }
    }
  }

  await connection.close()
}
function generateAvatar (pos: number): {imgId: string, jpegImageData: BufferRet } {
  const imgId = generateId()
  const width = 128
  const height = 128
  const frameData = Buffer.alloc(width * height * 4)
  let i = 0

  const baseR = faker.datatype.number(255)
  const baseG = faker.datatype.number(255)
  const baseB = faker.datatype.number(255)

  while (i < frameData.length) {
    frameData[i++] = (baseR + faker.datatype.number(100)) % 255 // red
    frameData[i++] = (baseG + faker.datatype.number(100)) % 255 // green
    frameData[i++] = (baseB + faker.datatype.number(100)) % 255 // blue
    frameData[i++] = 0xff // alpha - ignored in JPEGs
  }
  const rawImageData = {
    data: frameData,
    width: width,
    height: height
  }
  const jpegImageData = jpeg.encode(rawImageData, 50)
  return { imgId, jpegImageData }
}
