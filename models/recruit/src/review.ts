import { FindOptions } from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import calendar from '@hcengineering/model-calendar'
import contact from '@hcengineering/model-contact'
import core from '@hcengineering/model-core'
import view, { createAction } from '@hcengineering/model-view'
import { Review } from '@hcengineering/recruit'
import { BuildModelKey } from '@hcengineering/view'
import recruit from './plugin'
import notification from '@hcengineering/notification'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'

export const reviewTableOptions: FindOptions<Review> = {
  lookup: {
    attachedTo: recruit.mixin.Candidate,
    participants: contact.mixin.Employee,
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
        mode: ['context', 'browser'],
        group: 'create'
      }
    },
    recruit.action.CreateOpinion
  )

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: recruit.component.ReviewPresenter
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: recruit.component.OpinionPresenter
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReview
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.CreateReview,
      element: 'top',
      props: {
        preserveCandidate: true
      },
      fillProps: {
        space: '_space',
        _id: 'candidate'
      }
    },
    label: recruit.string.CreateReview,
    icon: recruit.icon.Schedule,
    input: 'focus',
    category: recruit.category.Recruit,
    target: recruit.mixin.Candidate,
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
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

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: recruit.string.Review,
      icon: recruit.icon.Reviews,
      objectClass: recruit.class.Review
    },
    recruit.ids.ReviewNotificationGroup
  )

  generateClassNotificationTypes(builder, recruit.class.Review, recruit.ids.ReviewNotificationGroup, [], ['comments'])

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: recruit.string.NewReview,
      group: recruit.ids.ReviewNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: recruit.class.Review,
      providers: {
        [notification.providers.PlatformNotification]: true
      }
    },
    recruit.ids.ReviewCreateNotification
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
