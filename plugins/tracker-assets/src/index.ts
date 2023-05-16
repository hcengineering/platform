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

import { loadMetadata, addStringsLoader } from '@hcengineering/platform'
import tracker, { trackerId } from '@hcengineering/tracker'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(tracker.icon, {
  TrackerApplication: `${icons}#tracker`,
  Component: `${icons}#component`,
  Issue: `${icons}#issue`,
  Project: `${icons}#project`,
  Document: `${icons}#document`,
  Inbox: `${icons}#inbox`,
  MyIssues: `${icons}#myissues`,
  Views: `${icons}#views`,
  Issues: `${icons}#issues`,
  Components: `${icons}#components`,
  NewIssue: `${icons}#newissue`,
  Magnifier: `${icons}#magnifier`,
  Home: `${icons}#home`,
  RedCircle: `${icons}#red-circle`,
  Labels: `${icons}#priority-nopriority`, // TODO: add icon
  DueDate: `${icons}#inbox`, // TODO: add icon
  Parent: `${icons}#myissues`, // TODO: add icon
  Milestone: `${icons}#milestone`,
  IssueTemplates: `${icons}#issuetemplates`,
  Scrum: `${icons}#scrum`,
  Start: `${icons}#start`,
  Stop: `${icons}#stop`,

  CategoryBacklog: `${icons}#status-backlog`,
  CategoryUnstarted: `${icons}#status-todo`,
  CategoryStarted: `${icons}#status-inprogress`,
  CategoryCompleted: `${icons}#status-done`,
  CategoryCanceled: `${icons}#status-canceled`,
  PriorityNoPriority: `${icons}#priority-nopriority`,
  PriorityUrgent: `${icons}#priority-urgent`,
  PriorityHigh: `${icons}#priority-high`,
  PriorityMedium: `${icons}#priority-medium`,
  PriorityLow: `${icons}#priority-low`,

  ComponentsList: `${icons}#list`,
  ComponentsTimeline: `${icons}#timeline`,

  ComponentStatusBacklog: `${icons}#component-status-backlog`,
  ComponentStatusPlanned: `${icons}#component-status-planned`,
  ComponentStatusInProgress: `${icons}#component-status-in-progress`,
  ComponentStatusPaused: `${icons}#component-status-paused`,
  ComponentStatusCompleted: `${icons}#component-status-completed`,
  ComponentStatusCanceled: `${icons}#component-status-canceled`,

  MilestoneStatusPlanned: `${icons}#component-status-planned`,
  MilestoneStatusInProgress: `${icons}#component-status-in-progress`,
  MilestoneStatusPaused: `${icons}#component-status-paused`,
  MilestoneStatusCompleted: `${icons}#component-status-completed`,
  MilestoneStatusCanceled: `${icons}#component-status-canceled`,

  CopyID: `${icons}#copyID`,
  CopyURL: `${icons}#copyURL`,
  CopyBranch: `${icons}#copyBranch`,
  Duplicate: `${icons}#duplicate`,
  TimeReport: `${icons}#timeReport`,
  Estimation: `${icons}#timeReport`,

  Timeline: `${icons}#timeline`
})

addStringsLoader(trackerId, async (lang: string) => await import(`../lang/${lang}.json`))
