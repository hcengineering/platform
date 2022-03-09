import { Doc, FindOptions } from '@anticrm/core'
import { Builder } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import task from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import recruit from './plugin'

export function createReviewModel (builder: Builder): void {
  builder.mixin(recruit.class.ReviewCategory, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Review,
      createItemDialog: recruit.component.CreateReview
    }
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.AttributeEditor, {
    editor: recruit.component.Reviews
  })

  createTableViewlet(builder)
  createKanbanViewlet(builder)
  createStatusTableViewlet(builder)

  builder.mixin(recruit.class.Review, core.class.Class, task.mixin.KanbanCard, {
    card: recruit.component.KanbanReviewCard
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ReviewPresenter
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectValidator, {
    validator: recruit.validator.ReviewValidator
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.OpinionPresenter
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: recruit.string.CreateReview,
      icon: recruit.icon.Create,
      action: recruit.actionImpl.CreateReview
    },
    recruit.action.CreateReview
  )
  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Applicant,
    action: recruit.action.CreateReview
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: recruit.string.ReviewCategory,
      description: task.string.ManageStatusesWithin,
      icon: recruit.component.TemplatesIcon
    },
    recruit.space.ReviewTemplates
  )
}
function createStatusTableViewlet (builder: Builder): void {
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Review,
    descriptor: task.viewlet.StatusTable,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State,
        assignee: contact.class.Employee,
        doneState: task.class.DoneState
      }
    } as FindOptions<Doc>,
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.assignee',
      'startDate',
      'dueDate',
      { key: '', presenter: recruit.component.OpinionsPresenter, label: recruit.string.Opinions, sortingKey: 'opinions' },
      '$lookup.state',
      '$lookup.doneState',
      { presenter: attachment.component.AttachmentsPresenter, label: attachment.string.Files, sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
      'modifiedOn'
    ]
  })
}

function createKanbanViewlet (builder: Builder): void {
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Review,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State
      }
    } as FindOptions<Doc>,
    config: ['$lookup.attachedTo', '$lookup.state']
  })
}

function createTableViewlet (builder: Builder): void {
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Review,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State,
        assignee: contact.class.Employee,
        doneState: task.class.DoneState
      }
    } as FindOptions<Doc>,
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.assignee',
      'startDate',
      'dueDate',
      { key: '', presenter: recruit.component.OpinionsPresenter, label: recruit.string.Opinions, sortingKey: 'opinions' },
      '$lookup.state',
      '$lookup.doneState',
      { presenter: attachment.component.AttachmentsPresenter, label: attachment.string.Files, sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
      'modifiedOn'
    ]
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.AttributeEditor, {
    editor: recruit.component.Opinions
  })
}
