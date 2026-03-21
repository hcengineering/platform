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
import {
  isActiveMode,
  isArchivingMode,
  isDeletingMode,
  type MeasureContext,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid
} from '@hcengineering/core'

/** Whether this pod should run a GithubWorker for the workspace. */
export enum GithubWorkerWorkspaceState {
  /** Active workspace — connect and run worker. */
  Connect = 'connect',
  /** Not ready yet (upgrade, creation, …) or too inactive — recheck later; keep existing worker. */
  Wait = 'wait',
  /** Disabled, deleting, deleted, or archiving — do not run; drop worker if present. */
  Skip = 'skip'
}

export function getGithubWorkerState (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  workspaceInfo: WorkspaceInfoWithStatus,
  inactivityIntervalDays: number,
  checkedWorkspaces: Set<string>,
  nowMs: number = Date.now()
): GithubWorkerWorkspaceState {
  if (workspaceInfo?.uuid === undefined) {
    ctx.warn('No workspace exists for workspaceId', { workspace })
    return GithubWorkerWorkspaceState.Skip
  }
  if (workspaceInfo.isDisabled === true || isDeletingMode(workspaceInfo.mode) || isArchivingMode(workspaceInfo.mode)) {
    ctx.info('Workspace is disabled, deleting, or archived — skipping github worker', {
      workspace,
      mode: workspaceInfo.mode,
      isDisabled: workspaceInfo.isDisabled
    })
    return GithubWorkerWorkspaceState.Skip
  }
  if (!isActiveMode(workspaceInfo.mode)) {
    ctx.warn('Workspace is in maintenance, skipping for now.', { workspace, mode: workspaceInfo.mode })
    return GithubWorkerWorkspaceState.Wait
  }

  const lastVisitDays = (nowMs - (workspaceInfo.lastVisit ?? 0)) / (3600 * 24 * 1000)

  if (inactivityIntervalDays > 0 && lastVisitDays > inactivityIntervalDays) {
    if (!checkedWorkspaces.has(workspace)) {
      checkedWorkspaces.add(workspace)
      ctx.warn('Workspace is inactive for too long, skipping for now.', { workspace })
    }
    return GithubWorkerWorkspaceState.Wait
  }
  return GithubWorkerWorkspaceState.Connect
}
