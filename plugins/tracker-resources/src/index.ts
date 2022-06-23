//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Class, Client, Ref } from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { ObjectSearchResult } from '@anticrm/presentation'
import { Issue, Team } from '@anticrm/tracker'
import Inbox from './components/inbox/Inbox.svelte'
import Active from './components/issues/Active.svelte'
import AssigneePresenter from './components/issues/AssigneePresenter.svelte'
import Backlog from './components/issues/Backlog.svelte'
import DueDatePresenter from './components/issues/DueDatePresenter.svelte'
import EditIssue from './components/issues/edit/EditIssue.svelte'
import IssueItem from './components/issues/IssueItem.svelte'
import IssuePresenter from './components/issues/IssuePresenter.svelte'
import IssuePreview from './components/issues/IssuePreview.svelte'
import IssuesView from './components/issues/IssuesView.svelte'
import ListView from './components/issues/ListView.svelte'
import ModificationDatePresenter from './components/issues/ModificationDatePresenter.svelte'
import PriorityEditor from './components/issues/PriorityEditor.svelte'
import PriorityPresenter from './components/issues/PriorityPresenter.svelte'
import StatusEditor from './components/issues/StatusEditor.svelte'
import StatusPresenter from './components/issues/StatusPresenter.svelte'
import TitlePresenter from './components/issues/TitlePresenter.svelte'
import ViewOptionsPopup from './components/issues/ViewOptionsPopup.svelte'
import MyIssues from './components/myissues/MyIssues.svelte'
import NewIssueHeader from './components/NewIssueHeader.svelte'
import NopeComponent from './components/NopeComponent.svelte'
import EditProject from './components/projects/EditProject.svelte'
import IconPresenter from './components/projects/IconPresenter.svelte'
import LeadPresenter from './components/projects/LeadPresenter.svelte'
import ProjectEditor from './components/projects/ProjectEditor.svelte'
import ProjectMembersPresenter from './components/projects/ProjectMembersPresenter.svelte'
import ProjectPresenter from './components/projects/ProjectPresenter.svelte'
import Roadmap from './components/projects/Roadmap.svelte'
import TeamProjects from './components/projects/TeamProjects.svelte'
import Projects from './components/projects/Projects.svelte'
import ProjectStatusEditor from './components/projects/ProjectStatusEditor.svelte'
import ProjectStatusPresenter from './components/projects/ProjectStatusPresenter.svelte'
import ProjectTitlePresenter from './components/projects/ProjectTitlePresenter.svelte'
import TargetDatePresenter from './components/projects/TargetDatePresenter.svelte'
import SetDueDateActionPopup from './components/SetDueDateActionPopup.svelte'
import SetParentIssueActionPopup from './components/SetParentIssueActionPopup.svelte'
import Views from './components/views/Views.svelte'
import KanbanView from './components/issues/KanbanView.svelte'
import tracker from './plugin'
import { getIssueId } from './utils'

export async function queryIssue<D extends Issue> (
  _class: Ref<Class<D>>,
  client: Client,
  search: string
): Promise<ObjectSearchResult[]> {
  const teams = await client.findAll<Team>(tracker.class.Team, {})

  const named = new Map(
    (
      await client.findAll<Issue>(
        _class,
        { title: { $like: `%${search}%` } },
        {
          limit: 200,
          lookup: { space: tracker.class.Team }
        }
      )
    ).map((e) => [e._id, e])
  )
  for (const currentTeam of teams) {
    const nids: number[] = []
    for (let n = 0; n < currentTeam.sequence; n++) {
      const v = `${currentTeam.identifier}-${n}`
      if (v.includes(search)) {
        nids.push(n)
      }
    }
    if (nids.length > 0) {
      const numbered = await client.findAll<Issue>(
        _class,
        { number: { $in: nids } },
        { limit: 200, lookup: { space: tracker.class.Team } }
      )
      for (const d of numbered) {
        if (!named.has(d._id)) {
          named.set(d._id, d)
        }
      }
    }
  }

  return Array.from(named.values()).map((e) => ({
    doc: e,
    title: getIssueId(e.$lookup?.space as Team, e),
    icon: tracker.icon.TrackerApplication,
    component: IssueItem
  }))
}
export default async (): Promise<Resources> => ({
  component: {
    NopeComponent,
    Active,
    Backlog,
    Inbox,
    MyIssues,
    Projects,
    Views,
    IssuePresenter,
    ProjectPresenter,
    ProjectTitlePresenter,
    TitlePresenter,
    ModificationDatePresenter,
    PriorityPresenter,
    PriorityEditor,
    ProjectEditor,
    StatusPresenter,
    StatusEditor,
    AssigneePresenter,
    DueDatePresenter,
    EditIssue,
    NewIssueHeader,
    ViewOptionsPopup,
    IconPresenter,
    LeadPresenter,
    TargetDatePresenter,
    ProjectMembersPresenter,
    ProjectStatusPresenter,
    ProjectStatusEditor,
    SetDueDateActionPopup,
    SetParentIssueActionPopup,
    EditProject,
    IssuesView,
    ListView,
    KanbanView,
    TeamProjects,
    Roadmap,
    IssuePreview
  },
  completion: {
    IssueQuery: async (client: Client, query: string) => await queryIssue(tracker.class.Issue, client, query)
  }
})
