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

import type { Issue } from '@hcengineering/tracker'

export type IssueTimeInfo = Pick<
Issue,
'_id' | 'attachedTo' | 'parents' | 'status' | 'estimation' | 'reportedTime' | 'childInfo'
>

export interface IssueTimeStatsOptions<T extends IssueTimeInfo> {
  // Issue status belongs to the "unstarted" (backlog) category.
  isUnStarted: (issue: T) => boolean
  // Issue status belongs to a "won" or "lost" category.
  isClosed: (issue: T) => boolean
  // Do not count estimation of unstarted issues.
  skipUnStarted: boolean
  // Sub-issues are not listed on their own (e.g. sub-issues are hidden), so
  // all of them are counted through their parent.
  includeAllChildren: boolean
}

export interface IssueTimeStats {
  estimation: number
  reportedTime: number
}

/**
 * Sum estimation and reported time of a group of issues.
 *
 * Sub-issues with a parent in the same group are counted through that parent's
 * childInfo only. Sub-issues listed in another group are counted there, so only
 * the childInfo entries of sub-issues from this group are used (all of them if
 * includeAllChildren is set). Nothing is counted twice and time stays in the
 * group of the issue it belongs to. For a parent with estimated sub-issues the
 * sub-issue estimation replaces the parent one. For closed issues the
 * estimation is capped by the reported time.
 */
export function calcIssueTimeStats<T extends IssueTimeInfo> (
  docs: T[],
  options: IssueTimeStatsOptions<T>
): IssueTimeStats {
  const ids = new Set(docs.map((it) => it._id))
  const hasParentInGroup = (it: T): boolean =>
    ids.has(it.attachedTo) || (it.parents ?? []).some((p) => ids.has(p.parentId))
  const roots = docs.filter((it) => !hasParentInGroup(it))

  let estimation = 0
  let reportedTime = 0
  for (const it of roots) {
    const allChildren = it.childInfo ?? []
    const childInfo = options.includeAllChildren ? allChildren : allChildren.filter((ct) => ids.has(ct.childId))
    const cReported = childInfo.reduce((a, b) => a + b.reportedTime, 0)
    reportedTime += cReported !== 0 ? cReported + it.reportedTime : it.reportedTime

    if (options.skipUnStarted && options.isUnStarted(it)) continue

    const closed = options.isClosed(it)
    const cEstimation = childInfo.reduce((a, b) => a + b.estimation, 0)
    if (childInfo.length > 0 && cEstimation !== 0) {
      estimation += closed && cReported < cEstimation ? cReported : cEstimation
    } else if (childInfo.length === 0 && closed && it.reportedTime < it.estimation) {
      estimation += it.reportedTime
    } else {
      estimation += it.estimation
    }
  }
  return { estimation, reportedTime }
}
