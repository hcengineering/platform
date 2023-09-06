import { Organization } from '@hcengineering/contact'
import core, { Account, Client, Data, Doc, Ref, SortingOrder, TxOperations } from '@hcengineering/core'
import recruit, { Applicant, Vacancy } from '@hcengineering/recruit'
import task, { KanbanTemplate, State, calcRank, createStates } from '@hcengineering/task'

export async function createVacancy (
  rawClient: Client,
  name: string,
  templateId: Ref<KanbanTemplate>,
  account: Ref<Account>,
  company?: Ref<Organization>
): Promise<Ref<Vacancy>> {
  const client = new TxOperations(rawClient, account)
  const template = await client.findOne(task.class.KanbanTemplate, { _id: templateId })
  if (template === undefined) {
    throw Error(`Failed to find target kanban template: ${templateId}`)
  }

  const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Vacancy })
  if (sequence === undefined) {
    throw new Error('sequence object not found')
  }

  const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  const [states, doneStates] = await createStates(
    client,
    recruit.attribute.State,
    recruit.attribute.DoneState,
    templateId
  )

  const id = await client.createDoc(recruit.class.Vacancy, core.space.Space, {
    name,
    description: template.shortDescription ?? '',
    fullDescription: template.description,
    private: false,
    archived: false,
    company,
    number: (incResult as any).object.sequence,
    members: [],
    states,
    doneStates
  })

  return id
}

export async function createApplication (
  client: TxOperations,
  selectedState: State,
  _space: Ref<Vacancy>,
  doc: Doc,
  data: Data<Applicant>
): Promise<void> {
  if (selectedState === undefined) {
    throw new Error(`Please select initial state:${_space}`)
  }
  const state = await client.findOne(task.class.State, { space: _space, _id: selectedState?._id })
  if (state === undefined) {
    throw new Error(`create application: state not found space:${_space}`)
  }
  const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Applicant })
  if (sequence === undefined) {
    throw new Error('sequence object not found')
  }

  const lastOne = await client.findOne(recruit.class.Applicant, {}, { sort: { rank: SortingOrder.Descending } })
  const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  await client.addCollection(recruit.class.Applicant, _space, doc._id, recruit.mixin.Candidate, 'applications', {
    ...data,
    status: state._id,
    number: (incResult as any).object.sequence,
    rank: calcRank(lastOne, undefined)
  })
}
