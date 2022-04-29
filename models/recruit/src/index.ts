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

import type { Employee, Organization } from '@anticrm/contact'
import { Doc, FindOptions, IndexKind, Lookup, Ref, Timestamp } from '@anticrm/core'
import {
  Builder,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  TypeBoolean,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import calendar from '@anticrm/model-calendar'
import chunter from '@anticrm/model-chunter'
import contact, { TPerson } from '@anticrm/model-contact'
import core, { TSpace } from '@anticrm/model-core'
import presentation from '@anticrm/model-presentation'
import tags from '@anticrm/model-tags'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view, { actionTarget, createAction } from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import { Applicant, Candidate, Candidates, Vacancy } from '@anticrm/recruit'
import recruit from './plugin'
import { createReviewModel, reviewTableConfig, reviewTableOptions } from './review'
import { TOpinion, TReview, TReviewCategory } from './review-model'

@Model(recruit.class.Vacancy, task.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy)
export class TVacancy extends TSpaceWithStates implements Vacancy {
  @Prop(TypeMarkup(), recruit.string.FullDescription)
  @Index(IndexKind.FullText)
  fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(TypeDate(), recruit.string.Due, recruit.icon.Calendar)
  dueTo?: Timestamp

  @Prop(TypeString(), recruit.string.Location, recruit.icon.Location)
  @Index(IndexKind.FullText)
  location?: string

  @Prop(TypeRef(contact.class.Organization), recruit.string.Company, contact.icon.Company)
  company?: Ref<Organization>

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number
}

@Model(recruit.class.Candidates, core.class.Space)
@UX(recruit.string.CandidatePools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Mixin(recruit.mixin.Candidate, contact.class.Person)
@UX(recruit.string.Candidate, recruit.icon.RecruitApplication)
export class TCandidate extends TPerson implements Candidate {
  @Prop(TypeString(), recruit.string.Title)
  @Index(IndexKind.FullText)
  title?: string

  @Prop(Collection(recruit.class.Applicant), recruit.string.Applications)
  applications?: number

  @Prop(TypeBoolean(), recruit.string.Onsite)
  onsite?: boolean

  @Prop(TypeBoolean(), recruit.string.Remote)
  remote?: boolean

  @Prop(TypeString(), recruit.string.Source)
  @Index(IndexKind.FullText)
  source?: string

  @Prop(Collection(tags.class.TagReference, recruit.string.SkillLabel), recruit.string.SkillsLabel)
  skills?: number

  @Prop(Collection(recruit.class.Review, recruit.string.Review), recruit.string.Reviews)
  reviews?: number
}

@Model(recruit.class.Applicant, task.class.Task)
@UX(recruit.string.Application, recruit.icon.Application, recruit.string.ApplicationShort, 'number')
export class TApplicant extends TTask implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Candidate)
  declare attachedTo: Ref<Candidate>

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Vacancy), recruit.string.Vacancy)
  declare space: Ref<Vacancy>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(TypeRef(contact.class.Employee), recruit.string.AssignedRecruiter)
  declare assignee: Ref<Employee> | null
}

export function createModel (builder: Builder): void {
  builder.createModel(TVacancy, TCandidates, TCandidate, TApplicant, TReviewCategory, TReview, TOpinion)

  builder.mixin(recruit.class.Vacancy, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Applicant,
      createItemDialog: recruit.component.CreateApplication,
      createItemLabel: recruit.string.ApplicationCreateLabel
    }
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributeEditor, {
    editor: recruit.component.Applications
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Mixin, view.mixin.ObjectFactory, {
    component: recruit.component.CreateCandidate
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: recruit.string.RecruitApplication,
      icon: recruit.icon.RecruitApplication,
      hidden: false,
      navigatorModel: {
        spaces: [
          {
            label: recruit.string.ReviewCategory,
            spaceClass: recruit.class.ReviewCategory,
            addSpaceLabel: recruit.string.CreateReviewCategory,
            createComponent: recruit.component.CreateReviewCategory
          }
        ],
        specials: [
          {
            id: 'vacancies',
            component: recruit.component.Vacancies,
            icon: recruit.icon.Vacancy,
            label: recruit.string.Vacancies,
            createItemLabel: recruit.string.VacancyCreateLabel,
            position: 'bottom'
          },
          {
            id: 'applicants',
            component: recruit.component.ApplicationsView,
            icon: recruit.icon.Application,
            label: recruit.string.Applications,
            createItemLabel: recruit.string.ApplicationCreateLabel,
            position: 'bottom'
          },
          {
            id: 'candidates',
            component: recruit.component.Candidates,
            icon: contact.icon.Person,
            label: recruit.string.Candidates,
            createItemLabel: recruit.string.CandidateCreateLabel,
            position: 'bottom'
          },
          {
            id: 'archive',
            component: workbench.component.Archive,
            icon: view.icon.Archive,
            label: workbench.string.Archive,
            position: 'top',
            visibleIf: workbench.function.HasArchiveSpaces,
            spaceClass: recruit.class.Vacancy
          },
          {
            id: 'skills',
            component: recruit.component.SkillsView,
            icon: tags.icon.Tags,
            label: recruit.string.SkillsLabel,
            createItemLabel: recruit.string.SkillCreateLabel,
            position: 'bottom'
          },
          {
            id: 'assigned',
            label: task.string.Assigned,
            icon: task.icon.Task,
            component: task.component.AssignedTasks,
            componentProps: {
              labelTasks: recruit.string.Applications,
              _class: recruit.class.Applicant
            }
          },
          {
            id: 'upcoming',
            component: calendar.component.UpcomingEvents,
            componentProps: {
              _class: recruit.class.Review,
              options: reviewTableOptions,
              config: reviewTableConfig
            },
            icon: calendar.icon.Calendar,
            label: calendar.string.UpcomingEvents,
            position: 'top'
          }
        ]
      }
    },
    recruit.app.Recruit
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.mixin.Candidate,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        _id: {
          channels: contact.class.Channel
          // skills: tags.class.TagReference // Required if TagsItemPresenter is used
        }
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      'title',
      'city',
      {
        presenter: recruit.component.ApplicationsPresenter,
        label: recruit.string.ApplicationsShort,
        sortingKey: 'applications'
      },
      {
        presenter: attachment.component.AttachmentsPresenter,
        label: attachment.string.Files,
        sortingKey: 'attachments'
      },
      { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
      {
        // key: '$lookup.skills', // Required, since presenter require list of tag references or '' and TagsPopupPresenter
        presenter: tags.component.TagsPresenter, // tags.component.TagsPresenter,
        label: recruit.string.SkillsLabel,
        sortingKey: 'skills',
        props: {
          _class: recruit.mixin.Candidate,
          key: 'skills'
        }
      },
      'modifiedOn',
      '$lookup.channels'
    ]
  })

  const applicantTableLookup: Lookup<Applicant> = {
    attachedTo: [recruit.mixin.Candidate, { _id: { channels: contact.class.Channel } }],
    state: task.class.State,
    assignee: contact.class.Employee,
    doneState: task.class.DoneState
  }

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: task.viewlet.StatusTable,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: applicantTableLookup
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.assignee',
      '$lookup.state',
      '$lookup.doneState',
      {
        presenter: attachment.component.AttachmentsPresenter,
        label: attachment.string.Files,
        sortingKey: 'attachments'
      },
      { presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
      'modifiedOn',
      '$lookup.attachedTo.$lookup.channels'
    ]
  })

  const applicantKanbanLookup: Lookup<Applicant> = {
    attachedTo: recruit.mixin.Candidate,
    assignee: contact.class.Employee,
    _id: {
      todoItems: task.class.TodoItem
    }
  }

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: applicantKanbanLookup
    } as FindOptions<Doc>, // TODO: fix
    config: []
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, task.mixin.KanbanCard, {
    card: recruit.component.KanbanCard
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.PreviewPresenter, {
    presenter: recruit.component.KanbanCard
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditApplication
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditVacancy
  })

  builder.mixin(recruit.class.ReviewCategory, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditReviewCategory
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ApplicationPresenter
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.VacancyPresenter
  })

  builder.mixin(recruit.class.ReviewCategory, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ReviewCategoryPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectValidator, {
    validator: recruit.validator.ApplicantValidator
  })

  createAction(
    builder,
    recruit.action.CreateApplication,
    recruit.string.CreateAnApplication,
    recruit.actionImpl.CreateApplication,
    {
      icon: recruit.icon.Create,
      singleInput: true
    }
  )
  actionTarget(builder, recruit.action.CreateApplication, contact.class.Person, { mode: ['context', 'browser'] })

  createAction(
    builder,
    recruit.action.CreateCandidate,
    recruit.string.CreateCandidate,
    recruit.actionImpl.CreateCandidate,
    {
      icon: recruit.icon.Create,
      keyBinding: ['c'],
      singleInput: true
    }
  )

  actionTarget(builder, recruit.action.CreateCandidate, core.class.Doc, {
    mode: ['workbench', 'browser'],
    application: recruit.app.Recruit
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.mixin.Candidate,
    action: task.action.CreateTask,
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: recruit.string.Vacancies,
      description: recruit.string.ManageVacancyStatuses,
      icon: recruit.component.TemplatesIcon
    },
    recruit.space.VacancyTemplates
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: recruit.icon.Application,
      label: recruit.string.SearchApplication,
      query: recruit.completion.ApplicationQuery
    },
    recruit.completion.ApplicationCategory
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Vacancy,
    action: task.action.ArchiveSpace,
    query: {
      archived: false
    },
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Vacancy,
    action: task.action.UnarchiveSpace,
    query: {
      archived: true
    },
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.ReviewCategory,
    action: task.action.UnarchiveSpace,
    query: {
      archived: true
    },
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: recruit.string.EditVacancy,
      icon: recruit.icon.Vacancy,
      action: recruit.actionImpl.EditVacancy,
      singleInput: true
    },
    recruit.action.EditVacancy
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Vacancy,
    action: recruit.action.EditVacancy,
    query: {},
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })
  createReviewModel(builder)

  actionTarget(builder, view.action.Open, recruit.class.Vacancy, { mode: ['browser', 'context'] })
  actionTarget(builder, view.action.Open, recruit.class.Applicant, { mode: ['browser', 'context'] })
}

export { recruitOperation } from './migration'
export { default } from './plugin'
