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

import card from '@hcengineering/card'
import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import process from './plugin'

export function defineMethods (builder: Builder): void {
  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RunProcess,
      objectClass: process.class.Process,
      editor: process.component.SubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      createdContext: { _class: process.class.Execution },
      requiredParams: ['_id']
    },
    process.method.RunSubProcess
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RequestApproval,
      objectClass: process.class.ApproveRequest,
      editor: process.component.ApproveRequestEditor,
      presenter: process.component.ToDoPresenter,
      createdContext: {
        _class: process.class.ApproveRequest
      },
      requiredParams: ['user']
    },
    process.method.RequestApproval
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateToDo,
      editor: process.component.ToDoEditor,
      objectClass: process.class.ProcessToDo,
      presenter: process.component.ToDoPresenter,
      createdContext: { _class: process.class.ProcessToDo, nameField: 'title' },
      requiredParams: ['title', 'user'],
      defaultParams: {
        withRollback: true
      }
    },
    process.method.CreateToDo
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UpdateCard,
      editor: process.component.UpdateCardEditor,
      objectClass: card.class.Card,
      createdContext: null,
      presenter: process.component.UpdateCardPresenter,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateCard,
      objectClass: card.class.Card,
      editor: process.component.CreateCardEditor,
      presenter: process.component.CreateCardPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['title', '_class']
    },
    process.method.CreateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: core.string.AddRelation,
      objectClass: core.class.Relation,
      editor: process.component.AddRelationEditor,
      presenter: process.component.AddRelationPresenter,
      createdContext: { _class: core.class.Relation },
      requiredParams: ['association', 'direction', '_id']
    },
    process.method.AddRelation
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: card.string.AddTag,
      objectClass: card.class.Tag,
      editor: process.component.AddTagEditor,
      presenter: process.component.AddTagPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['_id']
    },
    process.method.AddTag
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CancelToDo,
      editor: process.component.CancelToDoEditor,
      presenter: process.component.ToDoValuePresenter,
      objectClass: process.class.ProcessToDo,
      requiredParams: ['_id'],
      createdContext: null
    },
    process.method.CancelToDo
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CancelProcess,
      editor: process.component.CancelSubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      objectClass: process.class.Process,
      requiredParams: ['_id'],
      createdContext: null
    },
    process.method.CancelSubProcess
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.LockCard,
      objectClass: card.class.Card,
      requiredParams: [],
      createdContext: null
    },
    process.method.LockCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.LockSection,
      objectClass: card.class.Card,
      editor: process.component.LockSectionEditor,
      presenter: process.component.LockSectionPresenter,
      requiredParams: ['_id'],
      createdContext: null
    },
    process.method.LockSection
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UnlockCard,
      objectClass: card.class.Card,
      requiredParams: [],
      createdContext: null
    },
    process.method.UnlockCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UnlockSection,
      objectClass: card.class.Card,
      editor: process.component.LockSectionEditor,
      presenter: process.component.UnLockSectionPresenter,
      requiredParams: ['_id'],
      createdContext: null
    },
    process.method.UnlockSection
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.LockField,
      objectClass: card.class.Card,
      editor: process.component.LockFieldEditor,
      presenter: process.component.LockFieldPresenter,
      requiredParams: ['value'],
      createdContext: null
    },
    process.method.LockField
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UnlockField,
      objectClass: card.class.Card,
      editor: process.component.LockFieldEditor,
      presenter: process.component.UnLockFieldPresenter,
      requiredParams: ['value'],
      createdContext: null
    },
    process.method.UnlockField
  )
}
