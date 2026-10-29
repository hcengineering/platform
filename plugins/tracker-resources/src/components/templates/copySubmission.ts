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
import type { IssueTemplateCopyFailure, IssueTemplateCopyResult } from './submitCopy'

interface CopySubmissionOptions {
  templates: IssueTemplate[]
  getTarget: () => Ref<Project> | undefined
  submit: (templates: IssueTemplate[], target: Ref<Project>) => Promise<IssueTemplateCopyResult | undefined>
  onUnavailable: () => void
  onFailure: (failures: IssueTemplateCopyFailure[]) => Promise<void>
  onComplete: () => void
}

/** Dialog submission state, kept outside Svelte so deferred lookup/write races can be tested in Node. */
export function createIssueTemplateCopySubmission (options: CopySubmissionOptions): () => Promise<void> {
  let processing = false
  // Remember successful writes per target so a partial-failure retry never repeats those copies.
  const copied = new Map<Ref<Project>, Set<Ref<IssueTemplate>>>()

  return async () => {
    const target = options.getTarget()
    if (processing || target === undefined) return
    processing = true
    const completed = copied.get(target) ?? new Set<Ref<IssueTemplate>>()
    const pending = options.templates.filter((it) => !completed.has(it._id))
    try {
      let result: IssueTemplateCopyResult | undefined
      try {
        result = pending.length > 0 ? await options.submit(pending, target) : { copied: [], failed: [] }
      } catch (error: unknown) {
        // A lookup failure happens before any writes, so all pending templates can be retried.
        result = { copied: [], failed: pending.map((template) => ({ template, error })) }
      }
      if (result === undefined) {
        if (options.getTarget() === target) options.onUnavailable()
        return
      }
      for (const template of result.copied) completed.add(template._id)
      copied.set(target, completed)
      if (result.failed.length > 0) {
        // Report failures even if the picker has changed; the failed operation still needs feedback.
        await options.onFailure(result.failed)
      } else if (options.getTarget() === target) {
        options.onComplete()
      }
    } finally {
      processing = false
    }
  }
}
