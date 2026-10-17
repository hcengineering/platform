/* eslint-disable import/first */
import type { Ref, Status } from '@hcengineering/core'
import { GithubIssueStateReason } from '@hcengineering/github'
import task from '@hcengineering/task'

jest.mock('octokit', () => ({}), { virtual: true })

import { guessStatus, toGithubStateReason } from '../utils'
/* eslint-enable import/first */

const statuses = [
  { _id: 'backlog' as Ref<Status>, category: task.statusCategory.UnStarted },
  { _id: 'in-progress' as Ref<Status>, category: task.statusCategory.Active },
  { _id: 'done' as Ref<Status>, category: task.statusCategory.Won },
  { _id: 'canceled' as Ref<Status>, category: task.statusCategory.Lost }
] as unknown as Status[]

describe('toGithubStateReason', () => {
  it('maps webhook state_reason values', () => {
    expect(toGithubStateReason('completed')).toBe(GithubIssueStateReason.Completed)
    expect(toGithubStateReason('reopened')).toBe(GithubIssueStateReason.Reopened)
    expect(toGithubStateReason('not_planned')).toBe(GithubIssueStateReason.NotPlanned)
  })

  it('returns undefined for missing or unknown values', () => {
    expect(toGithubStateReason(null)).toBeUndefined()
    expect(toGithubStateReason(undefined)).toBeUndefined()
    expect(toGithubStateReason('something_else')).toBeUndefined()
  })

  it('resolves an issue closed as not planned to a canceled status', async () => {
    const status = await guessStatus({ state: 'CLOSED', stateReason: toGithubStateReason('not_planned') }, statuses)
    expect(status._id).toBe('canceled')
  })

  it('resolves an issue closed as completed to a done status', async () => {
    const status = await guessStatus({ state: 'CLOSED', stateReason: toGithubStateReason('completed') }, statuses)
    expect(status._id).toBe('done')
  })
})
