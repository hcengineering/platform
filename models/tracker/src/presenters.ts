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

import { Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import view, { classPresenter } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import tracker from './plugin'

/**
 * Define presenters
 */
export function definePresenters (builder: Builder): void {
  //
  // Issue
  //
  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.IssuePresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: tracker.component.NotificationIssuePresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.PreviewPresenter, {
    presenter: tracker.component.IssuePreview
  })

  //
  // Issue Template
  //
  builder.mixin(tracker.class.IssueTemplate, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.IssueTemplatePresenter
  })

  //
  // Issue Status
  //
  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.StatusPresenter
  })

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.StatusRefPresenter
  })

  //
  // Time Spend Report
  //
  builder.mixin(tracker.class.TimeSpendReport, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.TimeSpendReport
  })

  //
  // Type Milestone Status
  //
  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.MilestoneStatusPresenter
  })

  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: tracker.component.MilestoneStatusEditor
  })

  //
  // Type Issue Priority
  //
  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.PriorityPresenter
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.PriorityRefPresenter
  })

  //
  // Project
  //
  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.ProjectPresenter
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.SpacePresenter, {
    presenter: tracker.component.ProjectSpacePresenter
  })

  //
  // Component
  //
  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectEditor, {
    editor: tracker.component.EditComponent
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.ComponentPresenter
  })

  classPresenter(
    builder,
    tracker.class.Component,
    tracker.component.ComponentSelector,
    tracker.component.ComponentSelector
  )

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: tracker.component.ComponentSelector
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.ComponentRefPresenter
  })

  ///  Milestones
  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.MilestonePresenter
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.MilestoneRefPresenter
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectEditor, {
    editor: tracker.component.EditMilestone
  })

  classPresenter(
    builder,
    tracker.class.TypeReportedTime,
    view.component.NumberPresenter,
    tracker.component.ReportedTimeEditor
  )
}
