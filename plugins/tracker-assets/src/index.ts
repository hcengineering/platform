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

import { loadMetadata, addStringsLoader } from '@anticrm/platform'
import tracker, { trackerId } from '@anticrm/tracker'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(tracker.icon, {
  TrackerApplication: `${icons}#tracker`,
  Project: `${icons}#project`,
  Issue: `${icons}#issue`,
  Team: `${icons}#team`,
  Document: `${icons}#document`,
  Inbox: `${icons}#inbox`,
  MyIssues: `${icons}#myissues`,
  Views: `${icons}#views`,
  Issues: `${icons}#myissues`,
  Projects: `${icons}#projects`,
  NewIssue: `${icons}#newissue`,
  Magnifier: `${icons}#magnifier`,
  Home: `${icons}#home`,
  Labels: `${icons}#priority-nopriority`, // TODO: add icon
  MoreActions: `${icons}#priority-nopriority`, // TODO: add icon
  DueDate: `${icons}#inbox`, // TODO: add icon
  Parent: `${icons}#myissues`, // TODO: add icon

  StatusBacklog: `${icons}#status-backlog`,
  StatusTodo: `${icons}#status-todo`,
  StatusInProgress: `${icons}#status-inprogress`,
  StatusDone: `${icons}#status-done`,
  StatusCanceled: `${icons}#status-canceled`,
  PriorityNoPriority: `${icons}#priority-nopriority`,
  PriorityUrgent: `${icons}#priority-urgent`,
  PriorityHigh: `${icons}#priority-high`,
  PriorityMedium: `${icons}#priority-medium`,
  PriorityLow: `${icons}#priority-low`
})

addStringsLoader(trackerId, async (lang: string) => await import(`../lang/${lang}.json`))
