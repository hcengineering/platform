//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Ref } from '@hcengineering/core'
import type { IssueTemplate, Project } from '@hcengineering/tracker'
import { createIssueTemplateCopySubmission } from '../copySubmission'
import type { IssueTemplateCopyFailure, IssueTemplateCopyResult } from '../submitCopy'

function deferred<T> (): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let complete!: (value: T) => void
  let fail!: (error: Error) => void
  const promise = new Promise<T>((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  return { promise, resolve: complete, reject: fail }
}

interface SubmissionTestContext {
  templates: IssueTemplate[]
  submit: jest.Mock<Promise<IssueTemplateCopyResult | undefined>, [IssueTemplate[], Ref<Project>]>
  onUnavailable: jest.Mock<void, []>
  onFailure: jest.Mock<Promise<void>, [IssueTemplateCopyFailure[]]>
  onComplete: jest.Mock<void, []>
  copy: () => Promise<void>
  select: (value?: string) => void
  getTarget: () => Ref<Project> | undefined
}

function setup (): SubmissionTestContext {
  // Only identity/title are read by the dialog submission state; document copying is tested separately.
  const templates = [
    { _id: 'first', title: 'First' },
    { _id: 'second', title: 'Second' }
  ] as IssueTemplate[]
  let target: Ref<Project> | undefined = 'target-a' as Ref<Project>
  const submit = jest
    .fn<Promise<IssueTemplateCopyResult | undefined>, [IssueTemplate[], Ref<Project>]>()
    .mockImplementation(async (selected) => ({ copied: selected, failed: [] }))
  const onUnavailable = jest.fn(() => {
    target = undefined
  })
  const onFailure = jest.fn<Promise<void>, [IssueTemplateCopyFailure[]]>(async () => {})
  const onComplete = jest.fn()
  const copy = createIssueTemplateCopySubmission({
    templates,
    getTarget: () => target,
    submit,
    onUnavailable,
    onFailure,
    onComplete
  })
  return {
    templates,
    submit,
    onUnavailable,
    onFailure,
    onComplete,
    copy,
    select: (value?: string) => {
      target = value as Ref<Project> | undefined
    },
    getTarget: () => target
  }
}

describe('copy submission selection races', () => {
  it.each(['unavailable', 'rejected', 'success', 'partial failure'])(
    'keeps B open when the pending operation for A ends in %s, then submits B separately',
    async (outcome) => {
      const { templates, submit, onUnavailable, onFailure, onComplete, copy, select, getTarget } = setup()
      const pending = deferred<IssueTemplateCopyResult | undefined>()
      submit.mockReturnValueOnce(pending.promise)
      const first = copy()
      expect(submit).toHaveBeenCalledWith(templates, 'target-a')
      select('target-b')
      await copy()
      expect(submit).toHaveBeenCalledTimes(1)

      if (outcome === 'unavailable') pending.resolve(undefined)
      else if (outcome === 'rejected') pending.reject(new Error('lookup failed'))
      else if (outcome === 'partial failure') {
        pending.resolve({
          copied: [templates[0]],
          failed: [{ template: templates[1], error: new Error('write failed') }]
        })
      } else pending.resolve({ copied: templates, failed: [] })
      await first

      expect(getTarget()).toBe('target-b')
      expect(onUnavailable).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
      expect(onFailure).toHaveBeenCalledTimes(['rejected', 'partial failure'].includes(outcome) ? 1 : 0)
      await copy()
      expect(submit).toHaveBeenLastCalledWith(templates, 'target-b')
      expect(onComplete).toHaveBeenCalledTimes(1)
    }
  )

  it('resets an unavailable current target and allows recovery', async () => {
    const { submit, onUnavailable, onComplete, copy, select, getTarget } = setup()
    submit.mockResolvedValueOnce(undefined)
    await copy()
    expect(onUnavailable).toHaveBeenCalledTimes(1)
    expect(getTarget()).toBeUndefined()
    await copy()
    expect(submit).toHaveBeenCalledTimes(1)
    select('target-b')
    await copy()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('reports lookup failures with every pending template and allows retry', async () => {
    const { templates, submit, onFailure, onComplete, copy } = setup()
    const error = new Error('lookup failed')
    submit.mockRejectedValueOnce(error)
    await copy()
    expect(onFailure).toHaveBeenCalledWith(templates.map((template) => ({ template, error })))
    expect(onComplete).not.toHaveBeenCalled()
    await copy()
    expect(submit).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('reports only failed templates and retries them without duplicating successful writes', async () => {
    const { templates, submit, onFailure, onComplete, copy } = setup()
    const failure = { template: templates[1], error: new Error('write failed') }
    submit.mockResolvedValueOnce({ copied: [templates[0]], failed: [failure] })
    await copy()
    expect(onFailure).toHaveBeenCalledWith([failure])
    expect(onComplete).not.toHaveBeenCalled()
    await copy()
    expect(submit).toHaveBeenLastCalledWith([templates[1]], 'target-a')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('remembers successful copies when returning to a previous target after a partial failure', async () => {
    const { templates, submit, copy, select } = setup()
    const failure = { template: templates[1], error: new Error('write failed') }
    submit.mockResolvedValueOnce({ copied: [templates[0]], failed: [failure] })
    await copy()
    select('target-b')
    await copy()
    expect(submit).toHaveBeenLastCalledWith(templates, 'target-b')
    select('target-a')
    await copy()
    expect(submit).toHaveBeenLastCalledWith([templates[1]], 'target-a')
  })

  it('blocks duplicate submissions while failure feedback is pending', async () => {
    const { templates, submit, onFailure, copy } = setup()
    const feedback = deferred<undefined>()
    onFailure.mockReturnValueOnce(feedback.promise)
    submit.mockResolvedValueOnce({ copied: [], failed: templates.map((template) => ({ template, error: 'failed' })) })
    const first = copy()
    // Wait for feedback to start without timers or DOM scheduling.
    await Promise.resolve()
    expect(onFailure).toHaveBeenCalledTimes(1)
    await copy()
    expect(submit).toHaveBeenCalledTimes(1)
    feedback.resolve(undefined)
    await first
    await copy()
    expect(submit).toHaveBeenCalledTimes(2)
  })
})
