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

// To help typescript locate view plugin properly
import type { Board, Card, CardAction, CardDate, CardLabel } from '@anticrm/board'
import type { Employee } from '@anticrm/contact'
import { TxOperations as Client, Doc, DOMAIN_MODEL, FindOptions, IndexKind, Ref, Type, Timestamp } from '@anticrm/core'
import {
  ArrOf,
  Builder,
  Collection,
  Index,
  Model,
  Prop,
  TypeBoolean,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core, { TAttachedDoc, TDoc, TObj } from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import { Asset, IntlString, Resource } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import board from './plugin'

/**
 * @public
 */
export function TypeCardDate (): Type<CardDate> {
  return { _class: board.class.CardDate, label: board.string.Dates }
}

@Model(board.class.Board, task.class.SpaceWithStates)
@UX(board.string.Board, board.icon.Board)
export class TBoard extends TSpaceWithStates implements Board {
  color!: number
  background!: string
}

@Model(board.class.CardDate, core.class.Obj, DOMAIN_MODEL)
@UX(board.string.Dates)
export class TCardDate extends TObj implements CardDate {
  dueDate?: Timestamp
  isChecked?: boolean
  startDate?: Timestamp
}

@Model(board.class.CardLabel, core.class.AttachedDoc, DOMAIN_MODEL)
@UX(board.string.Labels)
export class TCardLabel extends TAttachedDoc implements CardLabel {
  title!: string
  color!: number
  isHidden?: boolean
}

@Model(board.class.Card, task.class.Task)
@UX(board.string.Card, board.icon.Card, undefined, 'title')
export class TCard extends TTask implements Card {
  @Prop(TypeString(), board.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeBoolean(), board.string.IsArchived)
  isArchived?: boolean

  @Prop(TypeCardDate(), board.string.Dates)
  date?: CardDate

  @Prop(TypeMarkup(), board.string.Description)
  @Index(IndexKind.FullText)
  description!: string

  @Prop(Collection(board.class.CardLabel), board.string.Labels)
  labels?: Ref<CardLabel>[]

  @Prop(TypeString(), board.string.Location)
  @Index(IndexKind.FullText)
  location?: string

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(TypeRef(contact.class.Employee), board.string.Assignee)
  declare assignee: Ref<Employee> | null

  @Prop(ArrOf(TypeRef(contact.class.Employee)), board.string.Members)
  members?: Ref<Employee>[]
}

@Model(board.class.CardAction, core.class.Doc, DOMAIN_MODEL)
export class TCardAction extends TDoc implements CardAction {
  component?: AnyComponent
  hint?: IntlString
  icon!: Asset
  isInline?: boolean
  kind?: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'dangerous'
  label!: IntlString
  position!: number
  type!: string
  handler?: Resource<(card: Card, client: Client, e?: Event) => void>
  supported?: Resource<(card: Card, client: Client) => boolean>
}

export function createModel (builder: Builder): void {
  builder.createModel(TBoard, TCard, TCardLabel, TCardDate, TCardAction)

  builder.mixin(board.class.Board, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: board.class.Card
      // createItemDialog: board.component.CreateCard,
      // createItemLabel: board.string.CardCreateLabel
    }
  })
  builder.mixin(board.class.Board, core.class.Class, view.mixin.SpaceHeader, {
    header: board.component.BoardHeader
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: board.string.BoardApplication,
      icon: board.icon.Board,
      hidden: false,
      navigatorModel: {
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
    descriptor: board.viewlet.Kanban,
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

  builder.mixin(board.class.CardLabel, core.class.Class, view.mixin.AttributePresenter, {
    presenter: board.component.CardLabelPresenter
  })

  builder.mixin(board.class.CardDate, core.class.Class, view.mixin.AttributePresenter, {
    presenter: board.component.CardDatePresenter
  })

  builder.mixin(board.class.Board, core.class.Class, view.mixin.AttributePresenter, {
    presenter: board.component.BoardPresenter
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

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: task.string.Kanban,
      icon: task.icon.Kanban,
      component: board.component.KanbanView
    },
    board.viewlet.Kanban
  )

  // card actions
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.Join,
      position: 10,
      type: board.cardActionType.Suggested,
      handler: board.cardActionHandler.Join,
      supported: board.cardActionSupportedHandler.Join
    },
    board.cardAction.Join
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Members,
      position: 20,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.Members
    },
    board.cardAction.Members
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Labels,
      position: 30,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.Labels
    },
    board.cardAction.Labels
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.Checklist,
      position: 40,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.Checklist
    },
    board.cardAction.Checklist
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Dates,
      position: 50,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.Dates
    },
    board.cardAction.Dates
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.Attachments,
      position: 60,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.Attachments
    },
    board.cardAction.Attachments
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Cover,
      position: 70,
      type: board.cardActionType.Cover,
      handler: board.cardActionHandler.Cover
    },
    board.cardAction.Cover
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.CustomFields,
      position: 80,
      type: board.cardActionType.AddToCard,
      handler: board.cardActionHandler.CustomFields
    },
    board.cardAction.CustomFields
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      kind: 'transparent',
      label: board.string.AddButton,
      position: 90,
      type: board.cardActionType.Automation,
      handler: board.cardActionHandler.AddButton
    },
    board.cardAction.AddButton
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Move,
      position: 100,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.Move
    },
    board.cardAction.Move
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.Copy,
      position: 110,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.Copy
    },
    board.cardAction.Copy
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.MakeTemplate,
      position: 120,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.MakeTemplate
    },
    board.cardAction.MakeTemplate
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      label: board.string.Watch,
      position: 130,
      type: board.cardActionType.Action,
      component: board.component.WatchCard
    },
    board.cardAction.Watch
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.ToArchive,
      position: 140,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.Archive,
      supported: board.cardActionSupportedHandler.Archive
    },
    board.cardAction.Archive
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: true,
      label: board.string.SendToBoard,
      position: 140,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.SendToBoard,
      supported: board.cardActionSupportedHandler.SendToBoard
    },
    board.cardAction.SendToBoard
  )
  builder.createDoc(
    board.class.CardAction,
    core.space.Model,
    {
      icon: board.icon.Card,
      isInline: false,
      kind: 'dangerous',
      label: board.string.Delete,
      position: 150,
      type: board.cardActionType.Action,
      handler: board.cardActionHandler.Delete,
      supported: board.cardActionSupportedHandler.Delete
    },
    board.cardAction.Delete
  )
}

export { boardOperation } from './migration'
export { default } from './plugin'
