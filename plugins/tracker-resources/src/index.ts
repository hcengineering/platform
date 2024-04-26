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

import { Analytics } from '@hcengineering/analytics'
import core, {
  type Attribute,
  ClassifierKind,
  DOMAIN_CONFIGURATION,
  DOMAIN_MODEL,
  getCurrentAccount,
  type Space,
  toIdMap,
  type AttachedDoc,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type Ref,
  type RelatedDocument,
  type TxOperations,
  type DocManager
  AccountRole
} from '@hcengineering/core'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { type Status, translate, type Resources } from '@hcengineering/platform'
import { getClient, MessageBox, type ObjectSearchResult } from '@hcengineering/presentation'
import { type Component, type Issue, type Milestone, type Project } from '@hcengineering/tracker'
import { getCurrentLocation, navigate, showPopup, themeStore } from '@hcengineering/ui'
import ComponentEditor from './components/components/ComponentEditor.svelte'
import ComponentFilterValuePresenter from './components/components/ComponentFilterValuePresenter.svelte'
import ComponentPresenter from './components/components/ComponentPresenter.svelte'
import ComponentRefPresenter from './components/components/ComponentRefPresenter.svelte'
import Components from './components/components/Components.svelte'
import ComponentTitlePresenter from './components/components/ComponentTitlePresenter.svelte'
import EditComponent from './components/components/EditComponent.svelte'
import IconPresenter from './components/components/IconComponent.svelte'
import LeadPresenter from './components/components/LeadPresenter.svelte'
import ProjectComponents from './components/components/ProjectComponents.svelte'
import CreateIssue from './components/CreateIssue.svelte'
import EditRelatedTargets from './components/EditRelatedTargets.svelte'
import EditRelatedTargetsPopup from './components/EditRelatedTargetsPopup.svelte'
import Inbox from './components/inbox/Inbox.svelte'
import AssigneeEditor from './components/issues/AssigneeEditor.svelte'
import DueDatePresenter from './components/issues/DueDatePresenter.svelte'
import EditIssue from './components/issues/edit/EditIssue.svelte'
import IssueItem from './components/issues/IssueItem.svelte'
import IssuePresenter from './components/issues/IssuePresenter.svelte'
import IssuePreview from './components/issues/IssuePreview.svelte'
import Issues from './components/issues/Issues.svelte'
import IssueSearchIcon from './components/issues/IssueSearchIcon.svelte'
import IssuesView from './components/issues/IssuesView.svelte'
import KanbanView from './components/issues/KanbanView.svelte'
import ModificationDatePresenter from './components/issues/ModificationDatePresenter.svelte'
import NotificationIssuePresenter from './components/issues/NotificationIssuePresenter.svelte'
import PriorityEditor from './components/issues/PriorityEditor.svelte'
import PriorityFilterValuePresenter from './components/issues/PriorityFilterValuePresenter.svelte'
import PriorityInlineEditor from './components/issues/PriorityInlineEditor.svelte'
import PriorityPresenter from './components/issues/PriorityPresenter.svelte'
import PriorityRefPresenter from './components/issues/PriorityRefPresenter.svelte'
import RelatedIssueSelector from './components/issues/related/RelatedIssueSelector.svelte'
import RelatedIssuesSection from './components/issues/related/RelatedIssuesSection.svelte'
import StatusEditor from './components/issues/StatusEditor.svelte'
import StatusFilterValuePresenter from './components/issues/StatusFilterValuePresenter.svelte'
import StatusPresenter from './components/issues/StatusPresenter.svelte'
import TitlePresenter from './components/issues/TitlePresenter.svelte'
import EditMilestone from './components/milestones/EditMilestone.svelte'
import MilestoneDatePresenter from './components/milestones/MilestoneDatePresenter.svelte'
import MyIssues from './components/myissues/MyIssues.svelte'
import NewIssueHeader from './components/NewIssueHeader.svelte'
import NopeComponent from './components/NopeComponent.svelte'
import MembersArrayEditor from './components/projects/MembersArrayEditor.svelte'
import ProjectFilterValuePresenter from './components/projects/ProjectFilterValuePresenter.svelte'
import RelationsPopup from './components/RelationsPopup.svelte'
import SetDueDateActionPopup from './components/SetDueDateActionPopup.svelte'
import SetParentIssueActionPopup from './components/SetParentIssueActionPopup.svelte'
import SettingsRelatedTargets from './components/SettingsRelatedTargets.svelte'
import CreateIssueTemplate from './components/templates/CreateIssueTemplate.svelte'
import IssueExtra from './components/issues/IssueExtra.svelte'
import IssueStatusPresenter from './components/issues/IssueStatusPresenter.svelte'
import {
  getIssueTitle,
  getTitle,
  issueIdentifierProvider,
  issueLinkFragmentProvider,
  issueLinkProvider,
  issueTitleProvider,
  resolveLocation
} from './issues'
import tracker from './plugin'

import MilestoneEditor from './components/milestones/MilestoneEditor.svelte'
import MilestonePresenter from './components/milestones/MilestonePresenter.svelte'
import Milestones from './components/milestones/Milestones.svelte'
import MilestoneSelector from './components/milestones/MilestoneSelector.svelte'
import MilestoneStatusEditor from './components/milestones/MilestoneStatusEditor.svelte'
import MilestoneStatusIcon from './components/milestones/MilestoneStatusIcon.svelte'
import MilestoneStatusPresenter from './components/milestones/MilestoneStatusPresenter.svelte'
import MilestoneTitlePresenter from './components/milestones/MilestoneTitlePresenter.svelte'

import SubIssuesSelector from './components/issues/edit/SubIssuesSelector.svelte'
import EstimationEditor from './components/issues/timereport/EstimationEditor.svelte'
import ReportedTimeEditor from './components/issues/timereport/ReportedTimeEditor.svelte'
import TimeSpendReport from './components/issues/timereport/TimeSpendReport.svelte'

import RelatedIssues from './components/issues/related/RelatedIssues.svelte'
import RelatedIssueTemplates from './components/issues/related/RelatedIssueTemplates.svelte'

import ComponentSelector from './components/components/ComponentSelector.svelte'

import IssueTemplatePresenter from './components/templates/IssueTemplatePresenter.svelte'
import IssueTemplates from './components/templates/IssueTemplates.svelte'

import { deleteObject, deleteObjects } from '@hcengineering/view-resources'
import MoveAndDeleteMilestonePopup from './components/milestones/MoveAndDeleteMilestonePopup.svelte'
import EditIssueTemplate from './components/templates/EditIssueTemplate.svelte'
import TemplateEstimationEditor from './components/templates/EstimationEditor.svelte'
import {
  activeProjects,
  getAllComponents,
  getAllMilestones,
  getAllPriority,
  getComponentTitle,
  getIssueChatTitle,
  getIssueStatusCategories,
  getMilestoneTitle,
  getVisibleFilters,
  issuePrioritySort,
  issueStatusSort,
  milestoneSort,
  moveIssuesToAnotherMilestone,
  subIssueQuery
} from './utils'

import { AggregationManager, componentStore, grouppingComponentManager } from './component'
import PriorityIcon from './components/activity/PriorityIcon.svelte'
import StatusIcon from './components/activity/StatusIcon.svelte'
import DeleteComponentPresenter from './components/components/DeleteComponentPresenter.svelte'
import IssueStatusIcon from './components/issues/IssueStatusIcon.svelte'
import MoveIssues from './components/issues/Move.svelte'
import PriorityIconPresenter from './components/issues/PriorityIconPresenter.svelte'
import StatusRefPresenter from './components/issues/StatusRefPresenter.svelte'
import TimeSpendReportPopup from './components/issues/timereport/TimeSpendReportPopup.svelte'
import IssueStatistics from './components/milestones/IssueStatistics.svelte'
import MilestoneFilter from './components/milestones/MilestoneFilter.svelte'
import MilestoneRefPresenter from './components/milestones/MilestoneRefPresenter.svelte'
import CreateProject from './components/projects/CreateProject.svelte'
import ProjectPresenter from './components/projects/ProjectPresenter.svelte'
import ProjectSpacePresenter from './components/projects/ProjectSpacePresenter.svelte'

import { get } from 'svelte/store'

import { settingId } from '@hcengineering/setting'
import { getAllStates } from '@hcengineering/task-resources'
import EstimationValueEditor from './components/issues/timereport/EstimationValueEditor.svelte'
import TimePresenter from './components/issues/timereport/TimePresenter.svelte'
import { personAccountByIdStore, personAccountPersonByIdStore, personByIdStore } from '@hcengineering/contact-resources'
import contact, { AvatarType } from '@hcengineering/contact'
import task, { type TaskType } from '@hcengineering/task'
import notification, { type Collaborators } from '@hcengineering/notification'

export { default as AssigneeEditor } from './components/issues/AssigneeEditor.svelte'
export { default as SubIssueList } from './components/issues/edit/SubIssueList.svelte'
export { default as IssueStatusIcon } from './components/issues/IssueStatusIcon.svelte'
export { default as StatusPresenter } from './components/issues/StatusPresenter.svelte'

export { activeProjects, CreateProject, IssuePresenter, PriorityEditor, StatusEditor, TitlePresenter }

export async function queryIssue<D extends Issue> (
  _class: Ref<Class<D>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Issue> = { identifier: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Issue>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Issue>)
    }
  }

  const numbered = toIdMap(
    await client.findAll<Issue>(_class, q, {
      limit: 200
    })
  )

  const q2: DocumentQuery<Issue> = { title: { $like: `%${search}%` } }
  if (q._id !== undefined) {
    q2._id = q._id
  }
  const named = await client.findAll<Issue>(_class, q2, { limit: 200 })
  for (const d of named) {
    if (d.identifier.includes(search) || d.title.includes(search)) {
      if (!numbered.has(d._id)) {
        numbered.set(d._id, d)
      }
    }
  }

  return Array.from(numbered.values()).map((e) => ({
    doc: e,
    title: e.identifier,
    icon: tracker.icon.TrackerApplication,
    component: IssueItem
  }))
}

async function move (issues: Issue | Issue[]): Promise<void> {
  showPopup(MoveIssues, { selected: issues }, 'top')
}

async function editWorkflowStatuses (project: Project): Promise<void> {
  const loc = getCurrentLocation()
  loc.path[2] = settingId
  loc.path[3] = 'statuses'
  loc.path[4] = project.type
  navigate(loc)
}

async function editProject (project: Project | undefined): Promise<void> {
  if (project !== undefined) {
    showPopup(CreateProject, { project })
  }
}

async function deleteIssue (issue: Issue | Issue[]): Promise<void> {
  const issueCount = Array.isArray(issue) ? issue.length : 1
  let subissues: number = 0
  if (Array.isArray(issue)) {
    issue.forEach((it) => {
      subissues += it.subIssues
    })
  } else {
    subissues = issue.subIssues
  }
  showPopup(
    MessageBox,
    {
      label: tracker.string.DeleteIssue,
      labelProps: { issueCount },
      message: tracker.string.DeleteIssueConfirm,
      params: {
        issueCount,
        subIssueCount: subissues
      }
    },
    undefined,
    async (result?: boolean) => {
      if (result === true) {
        const objs = Array.isArray(issue) ? issue : [issue]
        await deleteObjects(getClient(), objs as unknown as Doc[]).catch((err) => {
          console.error(err)
        })
      }
    }
  )
}

async function deleteProject (project: Project | undefined): Promise<void> {
  if (project !== undefined) {
    const client = getClient()

    if (project.archived) {
      // Clean project and all issues
      showPopup(
        MessageBox,
        {
          label: tracker.string.DeleteProject,
          labelProps: { name: project.name },
          message: tracker.string.ArchiveProjectConfirm
        },
        undefined,
        async (result?: boolean) => {
          if (result === true) {
            // void client.update(project, { archived: true })
            const client = getClient()
            const classes = await client.findAll(core.class.Class, {})
            const h = client.getHierarchy()
            for (const c of classes) {
              if (c.kind !== ClassifierKind.CLASS) {
                continue
              }
              const d = h.findDomain(c._id)
              if (d !== undefined && d !== DOMAIN_MODEL && d !== DOMAIN_CONFIGURATION) {
                try {
                  while (true) {
                    const docs = await client.findAll(c._id, { space: project._id }, { limit: 50 })
                    if (docs.length === 0) {
                      break
                    }
                    const ops = client.apply('delete')
                    for (const object of docs) {
                      if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
                        const adoc = object as AttachedDoc
                        await ops
                          .removeCollection(
                            object._class,
                            object.space,
                            adoc._id,
                            adoc.attachedTo,
                            adoc.attachedToClass,
                            adoc.collection
                          )
                          .catch((err) => {
                            console.error(err)
                          })
                      } else {
                        await ops.removeDoc(object._class, object.space, object._id).catch((err) => {
                          console.error(err)
                        })
                      }
                    }
                    await ops.commit()
                  }
                } catch (err: any) {
                  console.error(err)
                  Analytics.handleError(err)
                }
              }
            }
            await client.remove(project)
          }
        }
      )
    } else {
      const anyIssue = await client.findOne(tracker.class.Issue, { space: project._id })
      if (anyIssue !== undefined) {
        showPopup(
          MessageBox,
          {
            label: tracker.string.ArchiveProjectName,
            labelProps: { name: project.name },
            message: tracker.string.ProjectHasIssues
          },
          undefined,
          (result?: boolean) => {
            if (result === true) {
              void client.update(project, { archived: true })
            }
          }
        )
      } else {
        showPopup(
          MessageBox,
          {
            label: tracker.string.ArchiveProjectName,
            labelProps: { name: project.name },
            message: tracker.string.ArchiveProjectConfirm
          },
          undefined,
          (result?: boolean) => {
            if (result === true) {
              void client.update(project, { archived: true })
            }
          }
        )
      }
    }
  }
}

async function moveAndDeleteMilestones (
  client: TxOperations,
  oldMilestones: Milestone[],
  newMilestone?: Milestone
): Promise<void> {
  const noMilestoneLabel = await translate(tracker.string.NoMilestone, {}, get(themeStore).language)

  showPopup(
    MessageBox,
    {
      label: tracker.string.MoveAndDeleteMilestone,
      message: tracker.string.MoveAndDeleteMilestoneConfirm,
      labelProps: {
        newMilestone: newMilestone?.label ?? noMilestoneLabel,
        deleteMilestone: oldMilestones.map((p) => p.label)
      }
    },
    undefined,
    (result?: boolean) => {
      if (result === true) {
        for (const oldMilestone of oldMilestones) {
          void moveIssuesToAnotherMilestone(client, oldMilestone, newMilestone).then((success) => {
            if (success) {
              void deleteObject(client, oldMilestone)
            }
          })
        }
      }
    }
  )
}

async function deleteMilestone (milestones: Milestone | Milestone[]): Promise<void> {
  const client = getClient()
  const milestoneArray = Array.isArray(milestones) ? milestones : [milestones]
  // Check if available to move issues to another milestone
  const firstSearchedMilestone = await client.findOne(tracker.class.Milestone, {
    _id: { $nin: milestoneArray.map((p) => p._id) }
  })
  if (firstSearchedMilestone !== undefined) {
    showPopup(
      MoveAndDeleteMilestonePopup,
      {
        milestones: milestoneArray,
        moveAndDeleteMilestone: async (selectedMilestone?: Milestone) => {
          await moveAndDeleteMilestones(client, milestoneArray, selectedMilestone)
        }
      },
      'top'
    )
  } else {
    await moveAndDeleteMilestones(client, milestoneArray)
  }
}

type ImportIssue = Issue & { activity: ChatMessage[] }

export async function importTasks (tasks: File, space: Ref<Project>): Promise<void> {
  const reader = new FileReader()
  reader.readAsText(tasks)

  const personAccountById = get(personAccountByIdStore)
  const personAccountList = Array.from(personAccountById.values())
  const personAccountPersonById = get(personAccountPersonByIdStore)
  const personList = Array.from(get(personByIdStore).values())

  const client = getClient()
  const statuses = await client.findAll(tracker.class.IssueStatus, {})
  reader.onload = async () => {
    let tasksArray: ImportIssue[] = Array.from(JSON.parse(reader.result as string))
    const personToImport = Array.from(
      new Set(tasksArray.flatMap((t) => [t.createdBy, t.modifiedBy, ...t.activity.flatMap((act) => act.modifiedBy)]))
    ).filter((x) => x !== undefined) as string[]
    const peopleToAdd = personToImport.filter((p) => personList.find((x) => x.name === p) === undefined)
    if (peopleToAdd.length > 0) {
      console.log('Next people will be created to import properly', peopleToAdd)
      for (const personToCreate of peopleToAdd) {
        const personId = await client.createDoc(contact.class.Person, contact.space.Contacts, {
          name: personToCreate,
          avatarType: AvatarType.COLOR,
          city: '',
          comments: 0,
          channels: 0,
          attachments: 0
        })
        await client.createDoc(contact.class.PersonAccount, core.space.Model, {
          email: `imported:${personId}`,
          person: personId,
          role: AccountRole.User
        })
      }
    }
    const idsParent: Array<{ id: Ref<Issue>, identifier: string }> = []

    while (tasksArray.length > 0) {
      let taskParsing: ImportIssue | undefined = tasksArray.find((t: ImportIssue) => t?.parents?.length === 0)
      if (taskParsing === undefined) {
        taskParsing = tasksArray.find((t: Issue) =>
          t?.parents?.every((p) => idsParent.findIndex((par) => par.id === p.parentId) !== -1)
        )
      }
      if (taskParsing != null) {
        tasksArray = tasksArray.filter((t) => t._id !== taskParsing?._id)
        const proj = await client.findOne(tracker.class.Project, { _id: space })
        const modifiedByPerson = personList.find((p) => p.name === taskParsing?.modifiedBy)?._id
        const assignee =
          taskParsing.assignee !== null ? personList.find((p) => p.name === taskParsing?.assignee)?._id ?? null : null
        if (modifiedByPerson === undefined) throw new Error('Person not found')
        const modifiedBy = personAccountList.find((pA) => pA.person === modifiedByPerson)?._id
        if (modifiedBy === undefined) throw new Error('modifiedBy account not found')

        const collaborators = (taskParsing as any)['notification:mixin:Collaborators']?.collaborators
        const collaboratorsToImport =
          collaborators !== undefined
            ? collaborators
              .map((name: string) => {
                const person = personList.find((p) => p.name === name)?._id
                if (person === undefined) return undefined
                const account = personAccountPersonById.get(person)
                return account?._id
              })
              .filter((c: any) => c !== undefined)
            : undefined

        const incResult = await client.updateDoc(
          tracker.class.Project,
          core.space.Space,
          space,
          {
            $inc: { sequence: 1 }
          },
          true
        )
        const number = (incResult as any).object.sequence
        const identifier = `${proj?.identifier}-${number}`
        idsParent.push({ id: taskParsing._id, identifier })
        const taskKind = proj?.type !== undefined ? { parent: proj.type } : {}
        const kind = (await client.findOne(task.class.TaskType, taskKind)) as TaskType
        const status = statuses.find((s) => s.name === taskParsing?.status)?._id
        if (status === undefined) throw new Error('status not found')
        const taskToCreate = {
          title: taskParsing.title,
          description: taskParsing.description,
          component: taskParsing.component,
          milestone: taskParsing.milestone,
          number,
          status,
          priority: taskParsing.priority,
          rank: taskParsing.rank,
          comments: 0,
          subIssues: 0,
          dueDate: taskParsing.dueDate,
          parents: taskParsing.parents.map((p) => ({
            ...p,
            space,
            identifier: idsParent.find((par) => par.id === p.parentId)?.identifier ?? p.identifier
          })),
          reportedTime: 0,
          remainingTime: 0,
          estimation: taskParsing.estimation,
          reports: 0,
          childInfo: taskParsing.childInfo,
          identifier,
          modifiedBy,
          assignee,
          kind: kind._id
        }
        await client.addCollection(
          tracker.class.Issue,
          space,
          taskParsing?.attachedTo ?? tracker.ids.NoParent,
          taskParsing._class,
          'subIssues',
          taskToCreate,
          taskParsing._id
        )

        if (collaboratorsToImport !== undefined) {
          await client.createMixin<Doc, Collaborators>(
            taskParsing._id,
            taskParsing._class,
            space,
            notification.mixin.Collaborators,
            {
              collaborators: collaboratorsToImport
            }
          )
        }

        // Push activity
        if (taskParsing.activity !== undefined) {
          const act = taskParsing.activity.sort((a, b) => a.modifiedOn - b.modifiedOn)
          for (const activityMessage of act) {
            const modifiedByPerson = personList.find((p) => p.name === activityMessage.modifiedBy)?._id
            const modifiedBy = personAccountList.find((pA) => pA.person === modifiedByPerson)?._id
            if (modifiedBy === undefined) throw new Error('modifiedBy account not found')
            await client.addCollection(
              chunter.class.ChatMessage,
              space,
              taskParsing._id,
              tracker.class.Issue,
              'comments',
              {
                message: activityMessage.message
              },
              activityMessage._id,
              activityMessage.modifiedOn,
              modifiedBy
            )
          }
        }
      }
    }
  }
}

function filterComponents (doc: Component, target: Component): boolean {
  return doc.label.toLowerCase().trim() === target.label.toLowerCase().trim() && doc._id !== target._id
}

function setStore (manager: DocManager<Component>): void {
  componentStore.set(manager)
}

export default async (): Promise<Resources> => ({
  activity: {
    PriorityIcon,
    StatusIcon
  },
  component: {
    NopeComponent,
    Issues,
    Inbox,
    MyIssues,
    Components,
    IssuePresenter,
    ComponentPresenter,
    ComponentRefPresenter,
    ComponentTitlePresenter,
    TitlePresenter,
    ModificationDatePresenter,
    PriorityPresenter,
    PriorityEditor,
    PriorityInlineEditor,
    PriorityRefPresenter,
    MilestoneRefPresenter,
    ComponentEditor,
    StatusPresenter,
    StatusEditor,
    AssigneeEditor,
    DueDatePresenter,
    EditIssue,
    NewIssueHeader,
    IconPresenter,
    LeadPresenter,
    SetDueDateActionPopup,
    SetParentIssueActionPopup,
    EditComponent,
    IssuesView,
    KanbanView,
    ProjectComponents,
    IssuePreview,
    RelationsPopup,
    CreateIssue,
    CreateIssueTemplate,
    Milestones,
    MilestonePresenter,
    EditMilestone,
    MilestoneStatusPresenter,
    MilestoneStatusEditor,
    MilestoneTitlePresenter,
    MilestoneSelector,
    MilestoneEditor,
    ReportedTimeEditor,
    TimeSpendReport,
    EstimationEditor,
    SubIssuesSelector,
    RelatedIssues,
    RelatedIssueTemplates,
    ComponentSelector,
    IssueTemplates,
    IssueTemplatePresenter,
    EditIssueTemplate,
    TemplateEstimationEditor,
    CreateProject,
    ProjectPresenter,
    ProjectSpacePresenter,
    IssueStatistics,
    StatusRefPresenter,
    RelatedIssuesSection,
    RelatedIssueSelector,
    DeleteComponentPresenter,
    TimeSpendReportPopup,
    MilestoneDatePresenter,
    NotificationIssuePresenter,
    MilestoneFilter,
    PriorityFilterValuePresenter,
    StatusFilterValuePresenter,
    ProjectFilterValuePresenter,
    ComponentFilterValuePresenter,
    EditRelatedTargets,
    EditRelatedTargetsPopup,
    SettingsRelatedTargets,
    TimePresenter,
    EstimationValueEditor,
    IssueStatusIcon,
    MilestoneStatusIcon,
    PriorityIconPresenter,
    IssueSearchIcon,
    MembersArrayEditor,
    IssueExtra,
    IssueStatusPresenter
  },
  completion: {
    IssueQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryIssue(tracker.class.Issue, client, query, filter)
  },
  function: {
    IssueIdentifierProvider: issueIdentifierProvider,
    IssueTitleProvider: issueTitleProvider,
    ComponentTitleProvider: getComponentTitle,
    MilestoneTitleProvider: getMilestoneTitle,
    GetIssueId: getTitle,
    GetIssueLink: issueLinkProvider,
    GetIssueLinkFragment: issueLinkFragmentProvider,
    GetIssueTitle: getIssueTitle,
    IssueStatusSort: issueStatusSort,
    IssuePrioritySort: issuePrioritySort,
    MilestoneSort: milestoneSort,
    SubIssueQuery: subIssueQuery,
    GetAllPriority: getAllPriority,
    GetAllComponents: getAllComponents,
    GetAllMilestones: getAllMilestones,
    GetAllStates: async (
      query: DocumentQuery<Doc<Space>> | undefined,
      onUpdate: () => void,
      queryId: Ref<Doc<Space>>,
      attr: Attribute<Status>
    ) => await getAllStates(query, onUpdate, queryId, attr, false),
    GetVisibleFilters: getVisibleFilters,
    IssueChatTitleProvider: getIssueChatTitle,
    IsProjectJoined: async (project: Project) => project.members.includes(getCurrentAccount()._id),
    GetIssueStatusCategories: getIssueStatusCategories,
    SetComponentStore: setStore,
    ComponentFilterFunction: filterComponents
  },
  actionImpl: {
    Move: move,
    EditWorkflowStatuses: editWorkflowStatuses,
    EditProject: editProject,
    DeleteMilestone: deleteMilestone,
    DeleteProject: deleteProject,
    DeleteIssue: deleteIssue,
    ImportIssues: importTasks
  },
  resolver: {
    Location: resolveLocation
  },
  aggregation: {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreateComponentAggregationManager: AggregationManager.create,
    GrouppingComponentManager: grouppingComponentManager
  }
})
