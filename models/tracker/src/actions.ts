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
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import task from '@hcengineering/model-task'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench, { createNavigateAction } from '@hcengineering/model-workbench'
import { type IntlString } from '@hcengineering/platform'
import { TrackerEvents, trackerId } from '@hcengineering/tracker'
import { type KeyBinding } from '@hcengineering/view'
import tracker from './plugin'

import tags from '@hcengineering/tags'
import { defaultPriorities, issuePriorities } from '@hcengineering/tracker-resources/src/types'

function createGotoSpecialAction (
  builder: Builder,
  id: string,
  key: KeyBinding,
  label: IntlString,
  query?: Record<string, string | null>
): void {
  createNavigateAction(builder, key, label, tracker.app.Tracker, {
    application: trackerId,
    mode: 'space',
    spaceSpecial: id,
    spaceClass: tracker.class.Project,
    query
  })
}
export function createActions (builder: Builder, issuesId: string, componentsId: string, myIssuesId: string): void {
  createGotoSpecialAction(builder, issuesId, 'keyG->keyE', tracker.string.GotoIssues)
  createGotoSpecialAction(builder, issuesId, 'keyG->keyA', tracker.string.GotoActive, { mode: 'active' })
  createGotoSpecialAction(builder, issuesId, 'keyG->keyB', tracker.string.GotoBacklog, { mode: 'backlog' })
  createGotoSpecialAction(builder, componentsId, 'keyG->keyC', tracker.string.GotoComponents)
  createNavigateAction(builder, 'keyG->keyM', tracker.string.GotoMyIssues, tracker.app.Tracker, {
    application: trackerId,
    mode: 'special',
    special: myIssuesId
  })

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: trackerId
    },
    label: tracker.string.GotoTrackerApplication,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })

  createAction(
    builder,
    {
      action: tracker.actionImpl.EditWorkflowStatuses,
      label: tracker.string.EditWorkflowStatuses,
      icon: view.icon.Statuses,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      override: [task.action.EditStatuses],
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    tracker.action.EditWorkflowStatuses
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.EditProject,
      label: tracker.string.EditProject,
      icon: contact.icon.Edit,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      visibilityTester: view.function.CanEditSpace,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    tracker.action.EditProject
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteProject,
      label: workbench.string.Archive,
      icon: view.icon.Archive,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      visibilityTester: view.function.CanArchiveSpace,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      analyticsEvent: TrackerEvents.ProjectArchived,
      override: [view.action.Archive, view.action.Delete]
    },
    tracker.action.DeleteProject
  )
  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteProject,
      label: workbench.string.Delete,
      icon: view.icon.Delete,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      visibilityTester: view.function.CanDeleteSpace,
      query: {
        archived: true
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      analyticsEvent: TrackerEvents.ProjectDeleted,
      override: [view.action.Archive, view.action.Delete]
    },
    tracker.action.DeleteProjectClean
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteIssue,
      label: workbench.string.Delete,
      icon: view.icon.Delete,
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        group: 'remove'
      },
      visibilityTester: view.function.CanDeleteObject,
      override: [view.action.Delete],
      analyticsEvent: TrackerEvents.IssueDeleted
    },
    tracker.action.DeleteIssue
  )

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: tracker.string.TrackerApplication, visible: true },
    tracker.category.Tracker
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top'
      },
      label: tracker.string.NewIssue,
      icon: tracker.icon.NewIssue,
      keyBinding: ['keyC'],
      input: 'none',
      category: tracker.category.Tracker,
      target: core.class.Doc,
      context: {
        mode: ['browser'],
        application: tracker.app.Tracker,
        group: 'create'
      },
      override: [tracker.action.NewIssueGlobal],
      analyticsEvent: TrackerEvents.NewIssueBindingCalled
    },
    tracker.action.NewIssue
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top'
      },
      label: tracker.string.NewIssue,
      icon: tracker.icon.NewIssue,
      input: 'none',
      category: tracker.category.Tracker,
      target: core.class.Doc,
      context: {
        mode: [],
        group: 'create'
      },
      analyticsEvent: TrackerEvents.IssueCreateFromGlobalActionCalled
    },
    tracker.action.NewIssueGlobal
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'parentIssue',
          space: 'space'
        }
      },
      label: tracker.string.NewSubIssue,
      icon: tracker.icon.Subissue,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.NewSubIssue
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.SetParentIssueActionPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.SetParent,
      icon: tracker.icon.Parent,
      input: 'none',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.SetParent
  )
  createAction(
    builder,
    {
      action: view.actionImpl.UpdateDocument,
      actionProps: {
        key: 'attachedTo',
        value: tracker.ids.NoParent
      },
      query: {
        attachedTo: { $ne: tracker.ids.NoParent }
      },
      label: tracker.string.UnsetParentIssue,
      icon: tracker.icon.UnsetParent,
      input: 'none',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.UnsetParent
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'relatedTo',
          space: 'space'
        }
      },
      label: tracker.string.NewRelatedIssue,
      icon: tracker.icon.NewIssue,
      input: 'focus',
      category: tracker.category.Tracker,
      target: core.class.Doc,
      context: {
        mode: ['context', 'browser', 'editor'],
        group: 'associate'
      }
    },
    tracker.action.NewRelatedIssue
  )

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionPopup: tracker.component.SetParentIssueActionPopup,
    actionProps: {
      component: tracker.component.SetParentIssueActionPopup,
      element: 'top',
      fillProps: {
        _object: 'value'
      }
    },
    label: tracker.string.SetParent,
    icon: tracker.icon.Parent,
    input: 'none',
    category: tracker.category.Tracker,
    target: tracker.class.Issue,
    override: [tracker.action.SetParent],
    context: {
      mode: ['browser'],
      application: tracker.app.Tracker,
      group: 'associate'
    }
  })

  createAction(builder, {
    ...actionTemplates.open,
    actionProps: {
      component: tracker.component.EditIssue
    },
    target: tracker.class.Issue,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    override: [view.action.Open]
  })

  createAction(builder, {
    ...actionTemplates.open,
    actionProps: {
      component: tracker.component.EditIssueTemplate
    },
    target: tracker.class.IssueTemplate,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    override: [view.action.Open]
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: tracker.component.TimeSpendReportPopup,
      fillProps: {
        _object: 'issue'
      }
    },
    label: tracker.string.TimeSpendReportAdd,
    icon: tracker.icon.TimeReport,
    input: 'focus',
    keyBinding: ['keyT'],
    category: tracker.category.Tracker,
    target: tracker.class.Issue,
    context: {
      mode: ['context', 'browser'],
      application: tracker.app.Tracker,
      group: 'edit'
    }
  })

  createAction(
    builder,
    {
      action: task.actionImpl.SelectStatus,
      actionPopup: task.component.StatusSelector,
      actionProps: {
        _class: tracker.class.IssueStatus,
        ofAttribute: tracker.attribute.IssueStatus,
        placeholder: tracker.string.Status
      },
      label: tracker.string.Status,
      icon: tracker.icon.CategoryBacklog,
      keyBinding: ['keyS->keyS'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetStatus
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: view.component.ValueSelector,
      actionProps: {
        attribute: 'priority',
        values: defaultPriorities.map((p) => ({ id: p, ...issuePriorities[p] })),
        placeholder: tracker.string.SetPriority
      },
      label: tracker.string.Priority,
      icon: tracker.icon.PriorityHigh,
      keyBinding: ['keyP->keyR'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetPriority
  )
  createAction(
    builder,
    {
      action: view.actionImpl.AttributeSelector,
      actionPopup: tracker.component.AssigneeEditor,
      actionProps: {
        attribute: 'assignee',
        isAction: true,
        valueKey: 'object'
        // _class: contact.mixin.Employee,
        // query: {},
        // placeholder: tracker.string.AssignTo
      },
      label: tracker.string.Assignee,
      icon: contact.icon.Person,
      keyBinding: ['keyA'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetAssignee
  )

  createAction(
    builder,
    {
      action: view.actionImpl.AttributeSelector,
      actionPopup: tracker.component.ComponentEditor,
      actionProps: {
        attribute: 'component',
        isAction: true
      },
      label: tracker.string.Component,
      icon: tracker.icon.Component,
      keyBinding: ['keyM->keyT'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetComponent
  )

  createAction(
    builder,
    {
      action: view.actionImpl.AttributeSelector,
      actionPopup: tracker.component.MilestoneEditor,
      actionProps: {
        attribute: 'milestone',
        isAction: true
      },
      label: tracker.string.Milestone,
      icon: tracker.icon.Milestone,
      keyBinding: ['keyS->keyP'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetMilestone
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tags.component.ObjectsTagsEditorPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.Labels,
      icon: tags.icon.Tags,
      keyBinding: ['keyL'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetLabels
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.SetDueDateActionPopup,
        props: { withTime: false },
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.SetDueDate,
      icon: tracker.icon.DueDate,
      keyBinding: ['keyD'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetDueDate
  )

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueId
      },
      label: tracker.string.CopyIssueId,
      icon: view.icon.CopyId,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      visibilityTester: view.function.IsClipboardAvailable,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueId
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueTitle
      },
      label: tracker.string.CopyIssueTitle,
      icon: tracker.icon.CopyBranch,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      visibilityTester: view.function.IsClipboardAvailable,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueTitle
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueLink
      },
      label: tracker.string.CopyIssueUrl,
      icon: view.icon.CopyLink,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      visibilityTester: view.function.IsClipboardAvailable,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueLink
  )
  createAction(
    builder,
    {
      action: tracker.actionImpl.Move,
      label: tracker.string.MoveToProject,
      icon: view.icon.Move,
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      },
      override: [task.action.Move]
    },
    tracker.action.MoveToProject
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: tracker.component.RelationsPopup,
      actionProps: {
        attribute: ''
      },
      label: tracker.string.Relations,
      icon: tracker.icon.Relations,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.Relations
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'originalIssue',
          space: 'space'
        }
      },
      label: tracker.string.Duplicate,
      icon: tracker.icon.Duplicate,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.Duplicate
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteMilestone,
      label: view.string.Delete,
      icon: view.icon.Delete,
      keyBinding: ['Meta + Backspace'],
      category: tracker.category.Tracker,
      input: 'any',
      target: tracker.class.Milestone,
      context: { mode: ['context', 'browser'], group: 'remove' },
      visibilityTester: view.function.CanDeleteObject
    },
    tracker.action.DeleteMilestone
  )
  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.EditRelatedTargetsPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.MapRelatedIssues,
      icon: tracker.icon.Relations,
      input: 'none',
      category: tracker.category.Tracker,
      target: core.class.Space,
      query: {
        _class: { $ne: tracker.class.Project }
      },
      context: {
        mode: ['context'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.EditRelatedTargets
  )
}
