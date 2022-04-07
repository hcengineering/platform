//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

// To help typescript locate view plugin properly
import type { Board, Card } from '@anticrm/board'
import type { Employee } from '@anticrm/contact'
import { Doc, FindOptions, IndexKind, Ref } from '@anticrm/core'
import { Builder, Collection, Index, Model, Prop, TypeMarkup, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type {} from '@anticrm/view'
import board from './plugin'

@Model(board.class.Board, task.class.SpaceWithStates)
@UX(board.string.Board, board.icon.Board)
export class TBoard extends TSpaceWithStates implements Board {
  color!: number
  background!: string
}

@Model(board.class.Card, task.class.Task)
@UX(board.string.Card, board.icon.Card, undefined, 'title')
export class TCard extends TTask implements Card {
  @Prop(TypeString(), board.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeMarkup(), board.string.Description)
  @Index(IndexKind.FullText)
  description!: string

  @Prop(TypeString(), board.string.Location)
  @Index(IndexKind.FullText)
  location!: string

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(TypeRef(contact.class.Employee), board.string.Assignee)
  declare assignee: Ref<Employee> | null

  @Prop(Collection(contact.class.Employee), board.string.Members)
  members!: Ref<Employee>[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TBoard, TCard)

  builder.mixin(board.class.Board, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: board.class.Card
      // createItemDialog: board.component.CreateCard,
      // createItemLabel: board.string.CardCreateLabel
    }
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: board.string.BoardApplication,
      icon: board.icon.Board,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'boards',
            label: board.string.Boards,
            icon: board.icon.Board,
            component: board.component.Boards,
            position: 'top'
          },
          {
            id: 'members',
            label: board.string.Members,
            icon: board.icon.Board,
            component: board.component.Members,
            position: 'top'
          },
          {
            id: 'settings',
            label: board.string.Settings,
            icon: board.icon.Board,
            component: board.component.Settings,
            position: 'top'
          }
        ],
        spaces: [
          {
            label: board.string.MyBoards,
            spaceClass: board.class.Board,
            addSpaceLabel: board.string.BoardCreateLabel,
            createComponent: board.component.CreateBoard
          }
        ]
      }
    },
    board.app.Board
  )

  // const leadLookup: Lookup<Card> =
  // {
  //   state: task.class.State,
  //   doneState: task.class.DoneState
  // }

  // builder.createDoc(view.class.Viewlet, core.space.Model, {
  //   attachTo: board.class.Card,
  //   descriptor: task.viewlet.StatusTable,
  //   // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  //   options: {
  //     lookup: leadLookup
  //   } as FindOptions<Doc>, // TODO: fix
  //   config: [
  //     '',
  //     '$lookup.attachedTo',
  //     '$lookup.state',
  //     '$lookup.doneState',
  //     { presenter: attachment.component.AttachmentsPresenter, label: attachment.string.Files, sortingKey: 'attachments' },
  //     { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
  //     'modifiedOn',
  //     '$lookup.attachedTo.$lookup.channels'
  //   ]
  // })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: board.class.Card,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {}
    } as FindOptions<Doc>, // TODO: fix
    config: []
  })

  builder.mixin(board.class.Card, core.class.Class, task.mixin.KanbanCard, {
    card: board.component.KanbanCard
  })

  builder.mixin(board.class.Card, core.class.Class, view.mixin.ObjectEditor, {
    editor: board.component.EditCard
  })

  builder.mixin(board.class.Card, core.class.Class, view.mixin.AttributePresenter, {
    presenter: board.component.CardPresenter
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: board.string.Boards,
      description: board.string.ManageBoardStatuses,
      icon: board.component.TemplatesIcon
    },
    board.space.BoardTemplates
  )
}

export { createDeps } from './creation'
export { boardOperation } from './migration'
export { default } from './plugin'
