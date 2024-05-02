import { Organization } from '@hcengineering/contact'
import core, { Account, Client, Data, Doc, Ref, SortingOrder, Status, TxOperations, generateId, makeCollaborativeDoc } from '@hcengineering/core'
import recruit, { Applicant, Vacancy } from '@hcengineering/recruit'
import task, { ProjectType, makeRank } from '@hcengineering/task'

export async function createVacancy (
  rawClient: Client,
  name: string,
  typeId: Ref<ProjectType>,
  account: Ref<Account>,
  company?: Ref<Organization>
): Promise<Ref<Vacancy>> {
  const client = new TxOperations(rawClient, account)
  const type = await client.findOne(task.class.ProjectType, { _id: typeId })
  if (type === undefined) {
    throw Error(`Failed to find target project type: ${typeId}`)
  }

  const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Vacancy })
  if (sequence === undefined) {
    throw new Error('sequence object not found')
  }

  const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  const id: Ref<Vacancy> = generateId()
  await client.createDoc(recruit.class.Vacancy, core.space.Space, {
    name,
    description: type.shortDescription ?? '',
    fullDescription: makeCollaborativeDoc(id, 'fullDescription'),
    private: false,
    archived: false,
    company,
    number: (incResult as any).object.sequence,
    members: [],
    type: typeId
    // $content: {
    //   fullDescription: type.description
    // }
  }, id)

  return id
}

export async function createApplication (
  client: TxOperations,
  selectedState: Status,
  _space: Ref<Vacancy>,
  doc: Doc,
  data: Data<Applicant>
): Promise<void> {
  if (selectedState === undefined) {
    throw new Error(`Please select initial state:${_space}`)
  }
  const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Applicant })
  if (sequence === undefined) {
    throw new Error('sequence object not found')
  }

  const lastOne = await client.findOne(recruit.class.Applicant, {}, { sort: { rank: SortingOrder.Descending } })
  const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  await client.addCollection(recruit.class.Applicant, _space, doc._id, recruit.mixin.Candidate, 'applications', {
    ...data,
    status: selectedState._id,
    number: (incResult as any).object.sequence,
    rank: makeRank(lastOne?.rank, undefined)
  })
}
