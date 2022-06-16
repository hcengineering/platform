import { FindOptions } from '@anticrm/core'
import { Builder } from '@anticrm/model'
import calendar from '@anticrm/model-calendar'
import contact from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import view, { createAction } from '@anticrm/model-view'
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
  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.CollectionEditor, {
    editor: recruit.component.Reviews
  })

  createTableViewlet(builder)

  createAction(
    builder,
    {
      label: recruit.string.CreateOpinion,
      icon: recruit.icon.Create,
      action: recruit.actionImpl.CreateOpinion,
      input: 'focus',
      category: recruit.category.Recruit,
      target: recruit.class.Review,
      context: {
        mode: ['context', 'browser']
      }
    },
    recruit.action.CreateOpinion
  )

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ReviewPresenter
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.OpinionPresenter
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.CreateReview,
      _id: 'candidate',
      _space: 'space',
      element: 'top',
      props: {
        preserveCandidate: true
      }
    },
    label: recruit.string.CreateReview,
    icon: recruit.icon.Create,
    input: 'focus',
    category: recruit.category.Recruit,
    target: recruit.mixin.Candidate,
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Review,
      descriptor: calendar.viewlet.Calendar,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      config: [
        '',
        'title',
        '$lookup.attachedTo',
        '$lookup.company',
        { key: '', presenter: calendar.component.DateTimePresenter, label: calendar.string.Date, sortingKey: 'date' }
      ]
    },
    recruit.viewlet.CalendarReview
  )
}

function createTableViewlet (builder: Builder): void {
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Review,
      descriptor: view.viewlet.Table,
      config: reviewTableConfig
    },
    recruit.viewlet.TableReview
  )

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.CollectionEditor, {
    editor: recruit.component.Opinions
  })
}
