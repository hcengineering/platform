//
// Copyright © 2023 Hardcore Engineering Inc.
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

import contact from '@hcengineering/contact'
import { SortingOrder } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import task from '@hcengineering/model-task'
import view, { showColorsViewOption } from '@hcengineering/model-view'
import tags from '@hcengineering/tags'
import { type ViewOptionModel, type BuildModelKey, type ViewOptionsModel } from '@hcengineering/view'
import tracker from './plugin'

export const issuesOptions = (kanban: boolean): ViewOptionsModel => ({
  groupBy: [
    'status',
    'kind',
    'assignee',
    'priority',
    'space',
    'component',
    'milestone',
    'createdBy',
    'modifiedBy',
    'estimation',
    'remainingTime',
    'reportedTime'
  ],
  orderBy: [
    ['modifiedOn', SortingOrder.Descending],
    ['status', SortingOrder.Ascending],
    ['kind', SortingOrder.Ascending],
    ['priority', SortingOrder.Ascending],
    ['createdOn', SortingOrder.Descending],
    ['dueDate', SortingOrder.Ascending],
    ['rank', SortingOrder.Ascending],
    ['estimation', SortingOrder.Descending],
    ['remainingTime', SortingOrder.Descending],
    ['reportedTime', SortingOrder.Descending]
  ],
  other: [
    {
      key: 'shouldShowSubIssues',
      type: 'toggle',
      defaultValue: true,
      actionTarget: 'query',
      action: tracker.function.SubIssueQuery,
      label: tracker.string.SubIssues
    },
    {
      key: 'shouldShowAll',
      type: 'toggle',
      defaultValue: false,
      actionTarget: 'category',
      action: view.function.ShowEmptyGroups,
      label: view.string.ShowEmptyGroups
    },
    {
      key: 'hideArchived',
      type: 'toggle',
      defaultValue: true,
      actionTarget: 'options',
      action: view.function.HideArchived,
      label: view.string.HideArchived
    },
    ...(!kanban ? [showColorsViewOption] : [])
  ]
})

export function issueConfig (
  key: string = '',
  compact: boolean = false,
  milestone: boolean = true,
  component: boolean = true
): (BuildModelKey | string)[] {
  return [
    {
      key: '',
      label: tracker.string.Priority,
      presenter: tracker.component.PriorityEditor,
      props: { type: 'priority', kind: 'list', size: 'small' },
      displayProps: { key: 'priority' }
    },
    {
      key: '',
      label: tracker.string.Identifier,
      presenter: tracker.component.IssuePresenter,
      displayProps: { key: key + 'issue', fixed: 'left' }
    },
    {
      key: '',
      label: tracker.string.Status,
      presenter: tracker.component.StatusEditor,
      props: { kind: 'list', size: 'small', justify: 'center' },
      displayProps: { key: key + 'status' }
    },
    {
      key: 'kind',
      label: task.string.TaskType,
      presenter: task.component.TaskTypeListPresenter,
      props: { kind: 'list', size: 'small', justify: 'center' },
      displayProps: { key: key + 'kind' }
    },
    {
      key: '',
      label: tracker.string.Title,
      presenter: tracker.component.TitlePresenter,
      props: compact
        ? { shouldUseMargin: true, showParent: false, grow: true, minWidth: '5rem' }
        : { grow: true, minWidth: '5rem' },
      displayProps: { key: key + 'title' }
    },
    {
      key: '',
      label: tracker.string.SubIssues,
      presenter: tracker.component.SubIssuesSelector,
      props: {}
    },
    { key: 'comments', displayProps: { key: key + 'comments', suffix: true } },
    { key: 'attachments', displayProps: { key: key + 'attachments', suffix: true } },
    { key: '', displayProps: { grow: true } },
    {
      key: 'labels',
      presenter: tags.component.LabelsPresenter,
      displayProps: { compression: true },
      props: { kind: 'list', full: false }
    },
    {
      key: '',
      label: tracker.string.Extensions,
      presenter: tracker.component.IssueExtra,
      displayProps: { compression: true },
      props: { kind: 'list', full: false }
    },
    ...(milestone
      ? [
          {
            key: '',
            label: tracker.string.Milestone,
            presenter: tracker.component.MilestoneEditor,
            props: {
              kind: 'list',
              size: 'small',
              shouldShowPlaceholder: false,
              maxWidth: '30rem'
            },
            displayProps: {
              key: key + 'milestone',
              excludeByKey: 'milestone',
              compression: true
            }
          }
        ]
      : []),
    ...(component
      ? [
          {
            key: '',
            label: tracker.string.Component,
            presenter: tracker.component.ComponentEditor,
            props: {
              kind: 'list',
              size: 'small',
              shouldShowPlaceholder: false,
              maxWidth: '30rem'
            },
            displayProps: {
              key: key + 'component',
              excludeByKey: 'component',
              compression: true
            }
          }
        ]
      : []),
    {
      key: '',
      label: tracker.string.DueDate,
      presenter: tracker.component.DueDatePresenter,
      displayProps: { key: key + 'dueDate', compression: true },
      props: { kind: 'list' }
    },
    {
      // Tier-4 Item 10 — Predecessors column. Opt-in via "Configure columns"
      // (displayProps.optional = true) because the vast majority of issues
      // have zero predecessors and the cell would otherwise be permanently
      // empty in a default list. Renders the upstream Issue identifier
      // followed by kind+lag in the spec notation, e.g. "PROJ-3 FS+2d";
      // multiple predecessors collapse to "first +N more" with a hover
      // tooltip showing every dependency. Sortable is intentionally NOT
      // enabled — there is no meaningful total order across predecessor
      // lists. See spec 2026-05-14-huly-gantt-predecessor-column-design.md.
      key: '',
      label: tracker.string.Predecessors,
      presenter: tracker.component.PredecessorsColumn,
      displayProps: { key: key + 'predecessors', optional: true }
    },
    {
      key: '',
      label: tracker.string.Estimation,
      presenter: tracker.component.EstimationEditor,
      props: { kind: 'list', size: 'small' },
      displayProps: { key: key + 'estimation', fixed: 'left', dividerBefore: true, optional: true }
    },
    {
      key: 'modifiedOn',
      presenter: tracker.component.ModificationDatePresenter,
      displayProps: { key: key + 'modified', fixed: 'left', dividerBefore: true }
    },
    {
      key: 'assignee',
      presenter: tracker.component.AssigneeEditor,
      displayProps: { key: 'assignee', fixed: 'right' },
      props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
    }
  ]
}

export function ganttViewOptions (): ViewOptionsModel {
  // PR 2 ships a minimal read-only Gantt. Group-by + Show-colors are
  // intentionally NOT advertised — the canvas does not honour them yet.
  // The two sidebar-column toggles below ARE wired up to GanttSidebar.
  return {
    groupBy: [],
    orderBy: [
      ['startDate', SortingOrder.Ascending],
      ['rank', SortingOrder.Ascending],
      ['dueDate', SortingOrder.Ascending]
    ],
    other: [
      {
        key: 'ganttShowIssueCode',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttShowIssueCode
      },
      {
        key: 'ganttShowTitle',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'display',
        label: tracker.string.GanttShowTitle
      },
      {
        key: 'ganttShowStatus',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'display',
        label: tracker.string.GanttShowStatus
      },
      {
        // Default-on safety prompt: when set, dragging an issue's bar to a
        // new date range shows a confirm dialog before writing the change.
        // User feedback 2026-05-11: easy to misclick a bar while panning,
        // and a one-click confirm prevents accidental schedule edits.
        key: 'ganttConfirmMove',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'display',
        label: tracker.string.GanttConfirmMove
      },
      {
        // Same idea but for left/right resize handles.
        key: 'ganttConfirmResize',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'display',
        label: tracker.string.GanttConfirmResize
      },
      {
        // PR4a: sidebar column showing predecessor notation (e.g. "12FS+2d").
        // Hidden by default so existing users don't see a new column appear.
        // Toggling on requires no migration — the column is purely derived
        // from the IssueRelation collection that already exists from PR1.
        key: 'ganttShowPredecessors',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttShowPredecessors
      },
      {
        // PR5: critical-path overlay toggle. When on, critical bars get a red
        // border and fill overlay; critical relations get red arrows; non-critical
        // bars show a grey slack glyph.
        key: 'ganttCriticalPath',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.CriticalPathOn
      },
      {
        // PR5: slack column in the sidebar. Shows numeric slack days or "CP" badge
        // for critical issues. Requires ganttCriticalPath to be meaningful.
        key: 'ganttSlackColumn',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.SlackColumn
      },
      {
        // Phase 1.A — bar label slot (left of bar).
        // Default 'none' so existing users see no left-side label.
        key: 'ganttBarLabelLeft',
        type: 'dropdown',
        defaultValue: 'none',
        actionTarget: 'display',
        label: tracker.string.GanttBarLabelLeft,
        values: [
          { id: 'none',       label: tracker.string.BarLabelNone },
          { id: 'title',      label: tracker.string.BarLabelTitle },
          { id: 'identifier', label: tracker.string.BarLabelIdentifier },
          { id: 'assignee',   label: tracker.string.BarLabelAssignee },
          { id: 'priority',   label: tracker.string.BarLabelPriority },
          { id: 'status',     label: tracker.string.BarLabelStatus },
          { id: 'estimation', label: tracker.string.BarLabelEstimation },
          { id: 'progress',   label: tracker.string.BarLabelProgress }
        ]
      },
      {
        // Phase 1.A — bar label slot (inside bar, rendered only if bar > 60px wide).
        // Default 'title' preserves the legacy in-bar title rendering.
        key: 'ganttBarLabelInside',
        type: 'dropdown',
        defaultValue: 'title',
        actionTarget: 'display',
        label: tracker.string.GanttBarLabelInside,
        values: [
          { id: 'none',       label: tracker.string.BarLabelNone },
          { id: 'title',      label: tracker.string.BarLabelTitle },
          { id: 'identifier', label: tracker.string.BarLabelIdentifier },
          { id: 'assignee',   label: tracker.string.BarLabelAssignee },
          { id: 'priority',   label: tracker.string.BarLabelPriority },
          { id: 'status',     label: tracker.string.BarLabelStatus },
          { id: 'estimation', label: tracker.string.BarLabelEstimation },
          { id: 'progress',   label: tracker.string.BarLabelProgress }
        ]
      },
      {
        // Phase 1.A — bar label slot (right of bar).
        // Default 'none'.
        key: 'ganttBarLabelRight',
        type: 'dropdown',
        defaultValue: 'none',
        actionTarget: 'display',
        label: tracker.string.GanttBarLabelRight,
        values: [
          { id: 'none',       label: tracker.string.BarLabelNone },
          { id: 'title',      label: tracker.string.BarLabelTitle },
          { id: 'identifier', label: tracker.string.BarLabelIdentifier },
          { id: 'assignee',   label: tracker.string.BarLabelAssignee },
          { id: 'priority',   label: tracker.string.BarLabelPriority },
          { id: 'status',     label: tracker.string.BarLabelStatus },
          { id: 'estimation', label: tracker.string.BarLabelEstimation },
          { id: 'progress',   label: tracker.string.BarLabelProgress }
        ]
      },
      {
        // Phase 1.E — opt-in for Quick-Info-Popover.
        // false (default = legacy) = single-click only selects + focuses
        //   the bar (no popup, no editor); double-click on the bar opens
        //   the full editor as before. No behaviour change for existing users.
        // true = single-click selects + focuses AND opens the lightweight
        //   Quick-Info popover. Double-click continues to open the full
        //   editor on top of the popover.
        key: 'ganttQuickInfoOnClick',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttQuickInfoOnClick
      },
      {
        // Extended sidebar grid. When on, the sidebar renders a sortable
        // header row + per-column cells (identifier, title, predecessors,
        // slack, plus any toggled columns below). When off, the legacy
        // compact layout is preserved.
        key: 'ganttSidebarColumnsExtended',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarColumnsExtended
      },
      // Per-column visibility toggles for the extended sidebar. Hidden when
      // ganttSidebarColumnsExtended is off. Identifier + Title + Predecessors
      // + Slack are always shown (default column set).
      {
        key: 'ganttSidebarShowStatus',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowStatus,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowPriority',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowPriority,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowAssignee',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowAssignee,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowEstimation',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowEstimation,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowStartDate',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowStartDate,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowDueDate',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowDueDate,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowDeadline',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowDeadline,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        key: 'ganttSidebarShowProgress',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'display',
        label: tracker.string.GanttSidebarShowProgress,
        dependsOn: 'ganttSidebarColumnsExtended'
      },
      {
        // Phase 3b: group-by swimlanes. Issues group into horizontal lanes
        // by status/priority/assignee/component/milestone/label. Default
        // 'none' preserves the legacy hierarchy view bit-for-bit. The
        // sidebar shows a chevron + label + count header per lane; the
        // canvas paints a tint band behind each header.
        key: 'ganttGroupBy',
        type: 'dropdown',
        defaultValue: 'none',
        values: [
          { id: 'none', label: tracker.string.GanttGroupByNone },
          { id: 'status', label: tracker.string.GanttGroupByStatus },
          { id: 'priority', label: tracker.string.GanttGroupByPriority },
          { id: 'assignee', label: tracker.string.GanttGroupByAssignee },
          { id: 'component', label: tracker.string.GanttGroupByComponent },
          { id: 'milestone', label: tracker.string.GanttGroupByMilestone },
          { id: 'label', label: tracker.string.GanttGroupByLabel }
        ],
        actionTarget: 'display',
        label: tracker.string.GanttGroupBy
      }
    ]
  }
}

export function ganttConfig (): BuildModelKey[] {
  // Minimal config — Gantt drives its own column layout.
  return [
    { key: '', presenter: tracker.component.PriorityEditor, label: tracker.string.Priority, props: { kind: 'list', size: 'small' } },
    { key: '', presenter: tracker.component.IssuePresenter, label: tracker.string.Issue }
  ]
}

export function defineViewlets (builder: Builder): void {
  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: tracker.string.Board,
      icon: task.icon.Kanban,
      component: tracker.component.KanbanView
    },
    tracker.viewlet.Kanban
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: tracker.string.Gantt,
      icon: tracker.icon.Gantt,
      component: tracker.component.GanttView
    },
    tracker.viewlet.Gantt
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: issuesOptions(false),
      configOptions: {
        strict: true,
        hiddenKeys: [
          'title',
          'blockedBy',
          'relations',
          'description',
          'number',
          'reportedTime',
          'reports',
          'priority',
          'component',
          'milestone',
          'estimation',
          'remainingTime',
          'status',
          'dueDate',
          'attachedTo',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig()
    },
    tracker.viewlet.IssueList
  )

  const subIssuesOptions: ViewOptionsModel = {
    groupBy: ['status', 'kind', 'assignee', 'priority', 'milestone', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['rank', SortingOrder.Ascending],
      ['kind', SortingOrder.Ascending],
      ['status', SortingOrder.Ascending],
      ['priority', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending]
    ],
    groupDepth: 1,
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: subIssuesOptions,
      variant: 'subissue',
      configOptions: {
        strict: true,
        hiddenKeys: [
          'priority',
          'number',
          'status',
          'title',
          'dueDate',
          'milestone',
          'estimation',
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, true)
    },
    tracker.viewlet.SubIssues
  )

  const milestoneIssueOptions: ViewOptionsModel = {
    groupBy: ['status', 'assignee', 'priority', 'component', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['rank', SortingOrder.Ascending],
      ['status', SortingOrder.Ascending],
      ['priority', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending]
    ],
    groupDepth: 1,
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: milestoneIssueOptions,
      variant: 'milestone',
      configOptions: {
        strict: true,
        hiddenKeys: [
          'priority',
          'number',
          'status',
          'title',
          'dueDate',
          'milestone',
          'estimation',
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, false, true)
    },
    tracker.viewlet.MilestoneIssuesList
  )

  const componentIssueOptions: ViewOptionsModel = {
    groupBy: ['status', 'assignee', 'priority', 'milestone', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['rank', SortingOrder.Ascending],
      ['status', SortingOrder.Ascending],
      ['priority', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending]
    ],
    groupDepth: 1,
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: componentIssueOptions,
      variant: 'component',
      configOptions: {
        strict: true,
        hiddenKeys: [
          'priority',
          'number',
          'status',
          'title',
          'dueDate',
          'component',
          'estimation',
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, true, false)
    },
    tracker.viewlet.ComponentIssuesList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.IssueTemplate,
      descriptor: view.viewlet.List,
      viewOptions: {
        groupBy: ['assignee', 'priority', 'component', 'milestone', 'createdBy', 'modifiedBy'],
        orderBy: [
          ['priority', SortingOrder.Ascending],
          ['modifiedOn', SortingOrder.Descending],
          ['dueDate', SortingOrder.Ascending],
          ['rank', SortingOrder.Ascending]
        ],
        other: [showColorsViewOption]
      },
      configOptions: {
        strict: true,
        hiddenKeys: [
          'milestone',
          'estimation',
          'remainingTime',
          'reportedTime',
          'component',
          'title',
          'description',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: [
        // { key: '', presenter: tracker.component.PriorityEditor, props: { kind: 'list', size: 'small' } },
        {
          key: '',
          presenter: tracker.component.IssueTemplatePresenter,
          props: { type: 'issue', shouldUseMargin: true }
        },
        // { key: '', presenter: tracker.component.DueDatePresenter, props: { kind: 'list' } },
        {
          key: '',
          presenter: tracker.component.ComponentEditor,
          label: tracker.string.Component,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false,
            maxWidth: '30rem'
          },
          displayProps: { key: 'component', compression: true }
        },
        {
          key: '',
          label: tracker.string.Milestone,
          presenter: tracker.component.MilestoneEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false,
            maxWidth: '30rem'
          },
          displayProps: { key: 'milestone', compression: true }
        },
        {
          key: '',
          label: tracker.string.Estimation,
          presenter: tracker.component.TemplateEstimationEditor,
          props: {
            kind: 'list',
            size: 'small'
          },
          displayProps: { key: 'estimation', compression: true }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { fixed: 'right', dividerBefore: true }
        },
        {
          key: 'assignee',
          presenter: tracker.component.AssigneeEditor,
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        }
      ]
    },
    tracker.viewlet.IssueTemplateList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: tracker.viewlet.Kanban,
      viewOptions: {
        ...issuesOptions(true),
        groupDepth: 1
      },
      configOptions: {
        strict: true
      },
      config: [
        'subIssues',
        'priority',
        'component',
        'milestone',
        'dueDate',
        'labels',
        'estimation',
        'attachments',
        'comments'
      ]
    },
    tracker.viewlet.IssueKanban
  )

  // Gantt is registered AFTER List + Kanban so List remains the default
  // viewlet (ViewletSelector falls back to viewlets[0] when no preference
  // is saved). Putting Gantt last avoids surprising users with an empty
  // canvas on first visit.
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: tracker.viewlet.Gantt,
      viewOptions: ganttViewOptions(),
      configOptions: { strict: true, hiddenKeys: ['title'] },
      config: ganttConfig()
    },
    tracker.viewlet.IssueGantt
  )

  const componentListViewOptions: ViewOptionsModel = {
    groupBy: ['lead', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Component,
      descriptor: view.viewlet.List,
      viewOptions: componentListViewOptions,
      configOptions: {
        strict: true,
        hiddenKeys: ['label', 'description']
      },
      config: [
        {
          key: '',
          presenter: tracker.component.ComponentPresenter,
          props: { kind: 'list' },
          displayProps: { key: 'component', fixed: 'left' }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.lead',
          presenter: tracker.component.LeadPresenter,
          displayProps: {
            dividerBefore: true,
            key: 'lead'
          },
          props: { _class: tracker.class.Component, defaultClass: contact.mixin.Employee, shouldShowLabel: false }
        }
      ]
    },
    tracker.viewlet.ComponentList
  )

  const hideArchivedOption: ViewOptionModel = {
    key: 'hideArchived',
    type: 'toggle',
    defaultValue: false,
    actionTarget: 'options',
    action: view.function.HideArchived,
    label: view.string.HideArchived
  }

  const tableOptions: ViewOptionsModel = {
    groupBy: [],
    orderBy: [],
    other: [hideArchivedOption]
  }

  const projectListOptions: ViewOptionsModel = {
    groupBy: ['createdBy', 'modifiedBy'],
    orderBy: [
      ['name', SortingOrder.Ascending],
      ['identifier', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [hideArchivedOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Project,
      descriptor: view.viewlet.Table,
      viewOptions: tableOptions,
      configOptions: {
        hiddenKeys: ['identifier', 'name', 'description'],
        sortable: true
      },
      config: [
        {
          key: '',
          presenter: tracker.component.ProjectPresenter,
          props: {
            openIssues: true
          }
        },
        'members',
        {
          key: 'defaultAssignee',
          props: { kind: 'list' }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { fixed: 'right', dividerBefore: true }
        }
      ],
      options: {
        showArchived: true
      }
    },
    tracker.viewlet.ProjectList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Project,
      descriptor: view.viewlet.List,
      viewOptions: projectListOptions,
      configOptions: {
        strict: true,
        hiddenKeys: ['identifier', 'name', 'description']
      },
      config: [
        {
          key: '',
          presenter: tracker.component.ProjectPresenter,
          props: {
            openIssues: true,
            shouldUseMargin: true
          }
        },
        'members',
        {
          key: 'defaultAssignee',
          props: { kind: 'list' }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { fixed: 'right', dividerBefore: true }
        }
      ],
      options: {
        showArchived: true
      }
    },
    tracker.viewlet.ProjectListGrouped
  )

  const milestoneOptions: ViewOptionsModel = {
    groupBy: ['status', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['modifiedOn', SortingOrder.Descending],
      ['targetDate', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Milestone,
      descriptor: view.viewlet.List,
      viewOptions: milestoneOptions,
      configOptions: {
        strict: true,
        hiddenKeys: ['startDate', 'targetDate', 'label', 'description']
      },
      config: [
        {
          key: 'status',
          props: { width: '1rem', kind: 'list', size: 'small', justify: 'center' }
        },
        { key: '', presenter: tracker.component.MilestonePresenter, props: { shouldUseMargin: true } },
        { key: '', displayProps: { grow: true } },
        {
          key: '',
          label: tracker.string.StartDate,
          presenter: tracker.component.MilestoneDatePresenter,
          props: { field: 'startDate' }
        },
        {
          key: '',
          label: tracker.string.TargetDate,
          presenter: tracker.component.MilestoneDatePresenter,
          props: { field: 'targetDate' }
        }
      ]
    },
    tracker.viewlet.MilestoneList
  )
}
