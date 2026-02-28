// Copyright © 2025 Hardcore Engineering Inc.
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

import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import process from './plugin'

export function defineTriggers (builder: Builder): void {
  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnApproveRequestApproved,
      icon: process.icon.ToDo,
      editor: process.component.ApproveRequestTriggerEditor,
      presenter: process.component.ApproveRequestTriggerPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ApproveRequestApproved,
      init: false,
      auto: true
    },
    process.trigger.OnApproveRequestApproved
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnApproveRequestRejected,
      icon: process.icon.ToDoRemove,
      editor: process.component.ApproveRequestTriggerEditor,
      presenter: process.component.ApproveRequestTriggerPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ApproveRequestRejected,
      init: false,
      auto: true
    },
    process.trigger.OnApproveRequestRejected
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoDone,
      icon: process.icon.ToDo,
      editor: process.component.ToDoCloseEditor,
      presenter: process.component.ToDoSettingPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo,
      init: false,
      auto: true
    },
    process.trigger.OnToDoClose
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnExecutionStart,
      icon: process.icon.Process,
      init: true,
      requiredParams: []
    },
    process.trigger.OnExecutionStart
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoCancelled,
      icon: process.icon.ToDoRemove,
      editor: process.component.ToDoRemoveEditor,
      presenter: process.component.ToDoSettingPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo,
      init: false,
      auto: true
    },
    process.trigger.OnToDoRemove
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.WhenCardMatches,
      icon: process.icon.WhenCardMatches,
      editor: process.component.CardUpdateEditor,
      presenter: process.component.CardUpdatePresenter,
      requiredParams: [],
      checkFunction: process.triggerCheck.MatchCheck,
      init: false,
      auto: true
    },
    process.trigger.OnCardUpdate
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.WhenFieldChanges,
      icon: process.icon.WhenFieldChanges,
      editor: process.component.FieldChangesEditor,
      presenter: process.component.CardUpdatePresenter,
      requiredParams: [],
      checkFunction: process.triggerCheck.FieldChangedCheck,
      init: false,
      auto: false
    },
    process.trigger.WhenFieldChanges
  )

  // builder.createDoc(
  //   process.class.Trigger,
  //   core.space.Model,
  //   {
  //     label: process.string.OnEvent,
  //     icon: process.icon.OnEvent,
  //     editor: process.component.OnEventEditor,
  //     presenter: process.component.OnEventPresenter,
  //     requiredParams: [
  //       'eventType'
  //     ],
  //     checkFunction: process.triggerCheck.OnEventCheck,
  //     init: false,
  //     auto: false
  //   },
  //   process.trigger.OnEvent
  // )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnSubProcessesDone,
      icon: process.icon.WaitSubprocesses,
      checkFunction: process.triggerCheck.SubProcessesDoneCheck,
      requiredParams: [],
      init: false,
      auto: true
    },
    process.trigger.OnSubProcessesDone
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.WhenSubProcessMatches,
      icon: process.icon.WaitSubprocesses,
      editor: process.component.SubProcessMatchEditor,
      presenter: process.component.SubProcessMatchPresenter,
      checkFunction: process.triggerCheck.SubProcessMatchCheck,
      requiredParams: ['process'],
      init: false,
      auto: true
    },
    process.trigger.OnSubProcessMatch
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.WaitUntil,
      icon: process.icon.Time,
      requiredParams: [],
      init: false,
      auto: true,
      editor: process.component.TimeEditor,
      presenter: process.component.TimePresenter,
      checkFunction: process.triggerCheck.Time
    },
    process.trigger.OnTime
  )
}
