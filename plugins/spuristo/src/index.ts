//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Employee } from '@anticrm/contact'
import type { Class, Doc, Markup, Ref, Space, Timestamp } from '@anticrm/core'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface Team extends Space {
  teamLogo?: string | null
  identifier: string // Team identifier
  sequence: number
}
/**
 * @public
 */
export enum IssueStatus {
  Backlog,
  Todo,
  InProgress,
  Done,
  Canceled
}

/**
 * @public
 */
export enum IssuePriority {
  NoPriority,
  Urgent,
  High,
  Medium,
  Low
}

/**
 * @public
 */
export interface Issue extends Doc {
  title: string
  description: Markup
  status: IssueStatus
  priority: IssuePriority

  number: number
  assignee: Ref<Employee> | null

  // For subtasks
  parentIssue?: Ref<Issue>
  blockedBy?: Ref<Issue>[]
  relatedIssue?: Ref<Issue>[]

  comments: number
  attachments?: number
  labels?: string[]

  space: Ref<Team>

  dueDate: Timestamp | null

  rank: string
}

/**
 * @public
 */
export interface Document extends Doc {
  title: string
  icon: string | null
  color: number
  content?: Markup

  space: Ref<Team>
}

/**
 * @public
 */
export enum ProjectStatus {
  Planned,
  InProgress,
  Paused,
  Completed,
  Canceled
}

/**
 * @public
 */
export interface Project extends Doc {
  label: IntlString
  description?: Markup

  space: Ref<Team>

  comments: number
  attachments?: number

  startDate: Timestamp | null
  targetDate: Timestamp | null

  // Ref<Document>[]
  documents: number
}

/**
 * @public
 */
export const spuristoId = 'spuristo' as Plugin

export default plugin(spuristoId, {
  class: {
    Team: '' as Ref<Class<Team>>,
    Issue: '' as Ref<Class<Issue>>,
    Document: '' as Ref<Class<Document>>,
    Project: '' as Ref<Class<Project>>
  },
  component: {
    SpuristoApp: '' as AnyComponent
  },
  icon: {
    SpuristoApplication: '' as Asset,
    Project: '' as Asset,
    Issue: '' as Asset,
    Team: '' as Asset,
    Document: '' as Asset
  }
})
