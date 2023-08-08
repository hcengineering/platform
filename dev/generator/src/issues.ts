import faker from 'faker'

import contact from '@hcengineering/contact'
import core, {
  AttachedData,
  generateId,
  MeasureMetricsContext,
  metricsToString,
  Ref,
  SortingOrder,
  TxOperations,
  WorkspaceId
} from '@hcengineering/core'
import tracker, { calcRank, Issue, IssuePriority, IssueStatus } from '@hcengineering/tracker'

import { connect } from './connect'

let objectId: Ref<Issue> = generateId()
const space = tracker.project.DefaultProject

const object: AttachedData<Issue> = {
  title: '',
  description: '',
  assignee: null,
  component: null,
  milestone: null,
  number: 0,
  rank: '',
  doneState: null,
  status: '' as Ref<IssueStatus>,
  priority: IssuePriority.NoPriority,
  dueDate: null,
  comments: 0,
  subIssues: 0,
  parents: [],
  reportedTime: 0,
  estimation: 0,
  reports: 0,
  childInfo: []
}

export interface IssueOptions {
  count: number // how many issues to add
}

export async function generateIssues (
  transactorUrl: string,
  workspaceId: WorkspaceId,
  options: IssueOptions
): Promise<void> {
  const connection = await connect(transactorUrl, workspaceId)
  const accounts = await connection.findAll(contact.class.PersonAccount, {})
  const account = faker.random.arrayElement(accounts)
  const client = new TxOperations(connection, account._id)
  const ctx = new MeasureMetricsContext('recruit', {})

  const statuses = (await client.findAll(tracker.class.IssueStatus, { space }, { projection: { _id: 1 } })).map(
    (p) => p._id
  )

  for (let index = 0; index < options.count; index++) {
    console.log(`Generating issue ${index + 1}...`)
    await genIssue(client, statuses)
  }

  await connection.close()
  ctx.end()

  console.info(metricsToString(ctx.metrics, 'Client', 70))
}

async function genIssue (client: TxOperations, statuses: Ref<IssueStatus>[]): Promise<void> {
  const lastOne = await client.findOne<Issue>(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
  const incResult = await client.updateDoc(
    tracker.class.Project,
    core.space.Space,
    space,
    {
      $inc: { sequence: 1 }
    },
    true
  )
  const value: AttachedData<Issue> = {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraphs(),
    assignee: object.assignee,
    component: object.component,
    milestone: object.milestone,
    number: (incResult as any).object.sequence,
    doneState: null,
    status: faker.random.arrayElement(statuses),
    priority: faker.random.arrayElement(Object.values(IssuePriority)) as IssuePriority,
    rank: calcRank(lastOne, undefined),
    comments: 0,
    subIssues: 0,
    dueDate: object.dueDate,
    parents: [],
    reportedTime: 0,
    estimation: object.estimation,
    reports: 0,
    relations: [],
    childInfo: []
  }
  await client.addCollection(
    tracker.class.Issue,
    space,
    tracker.ids.NoParent,
    tracker.class.Issue,
    'subIssues',
    value,
    objectId
  )
  objectId = generateId()
}
