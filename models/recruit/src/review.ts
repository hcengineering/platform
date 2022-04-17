import { FindOptions } from '@anticrm/core'
import { Builder } from '@anticrm/model'
import calendar from '@anticrm/model-calendar'
import contact from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import task from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import { Review } from '@anticrm/recruit'
import { BuildModelKey } from '@anticrm/view'
import recruit from './plugin'

export const reviewTableOptions: FindOptions<Review> = {
  lookup: {
    attachedTo: recruit.mixin.Candidate,
    participants: contact.class.Employee,
    company: contact.class.Organization
  }
}
export const reviewTableConfig: (BuildModelKey | string)[] = [
  '',
  'title',
  '$lookup.attachedTo',
  // 'verdict',
  { key: '', presenter: recruit.component.OpinionsPresenter, label: recruit.string.Opinions, sortingKey: 'opinions' },
  {
    key: '$lookup.participants',
    presenter: calendar.component.PersonsPresenter,
    label: calendar.string.Participants,
    sortingKey: '$lookup.participants'
  },
  '$lookup.company',
  { key: '', presenter: calendar.component.DateTimePresenter, label: calendar.string.Date, sortingKey: 'date' },
  'modifiedOn'
]

export function createReviewModel (builder: Builder): void {
  builder.mixin(recruit.class.ReviewCategory, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Review,
      createItemDialog: recruit.component.CreateReview,
      createItemLabel: recruit.string.ReviewCreateLabel
    }
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.AttributeEditor, {
    editor: recruit.component.Reviews
  })

  createTableViewlet(builder)

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: recruit.string.CreateOpinion,
      icon: recruit.icon.Create,
      action: recruit.actionImpl.CreateOpinion,
      singleInput: true
    },
    recruit.action.CreateOpinion
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Review,
    action: recruit.action.CreateOpinion,
    context: {
      mode: ['context', 'browser']
    }
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
      action: recruit.actionImpl.CreateReview,
      singleInput: true
    },
    recruit.action.CreateReview
  )
  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Applicant,
    action: recruit.action.CreateReview,
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.ReviewCategory,
    action: task.action.ArchiveSpace,
    query: {
      archived: false
    },
    context: {
      mode: ['context', 'browser']
    }
  })

  const reviewOptions: FindOptions<Review> = {
    lookup: {
      attachedTo: recruit.mixin.Candidate,
      participants: contact.class.Employee,
      company: contact.class.Organization
    }
  }

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Review,
    descriptor: calendar.viewlet.Calendar,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: reviewOptions,
    config: reviewTableConfig
  })
}

function createTableViewlet (builder: Builder): void {
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Review,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: reviewTableOptions,
    config: reviewTableConfig
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.AttributeEditor, {
    editor: recruit.component.Opinions
  })
}
