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
import task, { TSpaceWithStates, TTask, actionTemplates } from '@anticrm/model-task'
import view, { createAction, actionTemplates as viewTemplates } from '@anticrm/model-view'
import workbench, { Application, createNavigateAction } from '@anticrm/model-workbench'
import { IntlString } from '@anticrm/platform'
import { Applicant, Candidate, Candidates, Vacancy } from '@anticrm/recruit'
import { KeyBinding } from '@anticrm/view'
import setting from '@anticrm/setting'
import recruit from './plugin'
import { createReviewModel, reviewTableConfig, reviewTableOptions } from './review'
import { TOpinion, TReview } from './review-model'

@Model(recruit.class.Vacancy, task.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy)
export class TVacancy extends TSpaceWithStates implements Vacancy {
  @Prop(TypeMarkup(), recruit.string.FullDescription)
  @Index(IndexKind.FullText)
  fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
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
@UX(recruit.string.TalentPools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Mixin(recruit.mixin.Candidate, contact.class.Person)
@UX(recruit.string.Talent, recruit.icon.RecruitApplication, undefined, 'name')
export class TCandidate extends TPerson implements Candidate {
  @Prop(TypeString(), recruit.string.Title)
  @Index(IndexKind.FullText)
  title?: string

  @Prop(Collection(recruit.class.Applicant), recruit.string.Applications, undefined, recruit.string.ApplicationsShort)
  applications?: number

  @Prop(TypeBoolean(), recruit.string.Onsite)
  onsite?: boolean

  @Prop(TypeBoolean(), recruit.string.Remote)
  remote?: boolean

  @Prop(TypeString(), recruit.string.Source)
  @Index(IndexKind.FullText)
  source?: string

  @Prop(Collection(tags.class.TagReference, recruit.string.SkillLabel), recruit.string.SkillsLabel, recruit.icon.Skills)
  skills?: number

  @Prop(Collection(recruit.class.Review, recruit.string.Review), recruit.string.Reviews)
  reviews?: number
}

@Model(recruit.class.Applicant, task.class.Task)
@UX(recruit.string.Application, recruit.icon.Application, recruit.string.ApplicationShort, 'number')
export class TApplicant extends TTask implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Talent)
  declare attachedTo: Ref<Candidate>

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Vacancy), recruit.string.Vacancy)
  declare space: Ref<Vacancy>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(TypeRef(contact.class.Employee), recruit.string.AssignedRecruiter)
  declare assignee: Ref<Employee> | null
}

export function createModel (builder: Builder): void {
  builder.createModel(TVacancy, TCandidates, TCandidate, TApplicant, TReview, TOpinion)

  builder.mixin(recruit.class.Vacancy, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Applicant,
      createItemDialog: recruit.component.CreateApplication,
      createItemLabel: recruit.string.ApplicationCreateLabel
    }
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.CollectionEditor, {
    editor: recruit.component.Applications
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Mixin, view.mixin.ObjectFactory, {
    component: recruit.component.CreateCandidate
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, setting.mixin.Editable, {})

  builder.mixin(recruit.class.Vacancy, core.class.Class, setting.mixin.Editable, {})

  const vacanciesId = 'vacancies'
  const talentsId = 'talents'
  const skillsId = 'skills'
  const candidatesId = 'candidates'
  const archiveId = 'archive'
  const assignedId = 'assigned'

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: recruit.string.RecruitApplication,
      icon: recruit.icon.RecruitApplication,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: vacanciesId,
            component: recruit.component.Vacancies,
            icon: recruit.icon.Vacancy,
            label: recruit.string.Vacancies,
            createItemLabel: recruit.string.VacancyCreateLabel,
            position: 'vacancy'
          },
          {
            id: candidatesId,
            component: workbench.component.SpecialView,
            icon: recruit.icon.Application,
            label: recruit.string.Applications,
            componentProps: {
              _class: recruit.class.Applicant,
              icon: recruit.icon.Application,
              label: recruit.string.Applications,
              createLabel: recruit.string.ApplicationCreateLabel,
              createComponent: recruit.component.CreateApplication,
              descriptor: task.viewlet.StatusTable,
              baseQuery: {
                doneState: null
              }
            },
            position: 'vacancy'
          },
          {
            id: talentsId,
            component: workbench.component.SpecialView,
            icon: contact.icon.Person,
            label: recruit.string.Talents,
            componentProps: {
              _class: recruit.mixin.Candidate,
              icon: contact.icon.Person,
              label: recruit.string.Talents,
              createLabel: recruit.string.TalentCreateLabel,
              createComponent: recruit.component.CreateCandidate
            },
            position: 'vacancy'
          },
          {
            id: archiveId,
            component: workbench.component.Archive,
            icon: view.icon.Archive,
            label: workbench.string.Archive,
            position: 'bottom',
            visibleIf: workbench.function.HasArchiveSpaces,
            spaceClass: recruit.class.Vacancy
          },
          {
            id: skillsId,
            component: recruit.component.SkillsView,
            icon: recruit.icon.Skills,
            label: recruit.string.SkillsLabel,
            createItemLabel: recruit.string.SkillCreateLabel,
            position: 'bottom'
          },
          {
            id: assignedId,
            label: task.string.Assigned,
            icon: recruit.icon.AssignedToMe,
            component: task.component.AssignedTasks,
            position: 'event',
            componentProps: {
              labelTasks: recruit.string.Applications,
              _class: recruit.class.Applicant
            }
          },
          {
            id: 'reviews',
            component: calendar.component.Events,
            componentProps: {
              viewLabel: recruit.string.Reviews,
              viewIcon: recruit.icon.Review,
              _class: recruit.class.Review,
              options: reviewTableOptions,
              config: reviewTableConfig,
              createLabel: recruit.string.ReviewCreateLabel,
              createComponent: recruit.component.CreateReview
            },
            icon: recruit.icon.Reviews,
            label: recruit.string.Reviews,
            position: 'event'
          }
        ]
      },
      navHeaderComponent: recruit.component.NewCandidateHeader
    },
    recruit.app.Recruit
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.mixin.Candidate,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'title',
        'city',
        'applications',
        'attachments',
        'comments',
        {
          // key: '$lookup.skills', // Required, since presenter require list of tag references or '' and TagsPopupPresenter
          key: '',
          presenter: tags.component.TagsPresenter,
          label: recruit.string.SkillsLabel,
          sortingKey: 'skills',
          props: {
            _class: recruit.mixin.Candidate,
            key: 'skills',
            icon: recruit.icon.Skills
          }
        },
        'modifiedOn',
        '$lookup.channels'
      ],
      hiddenKeys: ['name']
    },
    recruit.viewlet.TableCandidate
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Vacancy,
      descriptor: view.viewlet.Table,
      config: [
        '',
        {
          key: '@applications',
          label: recruit.string.Applications
        },
        '$lookup.company',
        'location',
        'description',
        {
          key: '@applications.modifiedOn',
          label: core.string.Modified
        }
      ],
      hiddenKeys: ['name', 'space', 'modifiedOn']
    },
    recruit.viewlet.TableVacancy
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: task.viewlet.StatusTable,
      config: [
        '',
        '$lookup.attachedTo',
        '$lookup.assignee',
        '$lookup.state',
        '$lookup.doneState',
        'attachments',
        'comments',
        'modifiedOn',
        '$lookup.attachedTo.$lookup.channels'
      ]
    },
    recruit.viewlet.TableApplicant
  )

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

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ApplicationPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: recruit.component.ApplicationsPresenter
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.VacancyPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectValidator, {
    validator: recruit.validator.ApplicantValidator
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: recruit.function.ApplicationTitleProvider
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: recruit.string.RecruitApplication, visible: true },
    recruit.category.Recruit
  )

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.CreateApplication,
      _id: 'candidate',
      element: 'top',
      props: {
        preserveCandidate: true
      }
    },
    label: recruit.string.CreateAnApplication,
    icon: recruit.icon.Create,
    input: 'focus',
    category: recruit.category.Recruit,
    target: contact.class.Person,
    context: { mode: ['context', 'browser'] },
    override: [recruit.action.CreateGlobalApplication]
  })
  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.CreateCandidate,
      element: 'top'
    },
    label: recruit.string.CreateTalent,
    icon: recruit.icon.Create,
    keyBinding: ['c'],
    input: 'none',
    category: recruit.category.Recruit,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser'],
      application: recruit.app.Recruit
    }
  })

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.CreateVacancy,
      element: 'top'
    },
    label: recruit.string.CreateVacancy,
    icon: recruit.icon.Create,
    keyBinding: [],
    input: 'none',
    category: recruit.category.Recruit,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser'],
      application: recruit.app.Recruit
    }
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: recruit.component.CreateApplication,
        element: 'top'
      },
      label: recruit.string.CreateApplication,
      icon: recruit.icon.Create,
      keyBinding: [],
      input: 'none',
      category: recruit.category.Recruit,
      target: core.class.Doc,
      context: {
        mode: ['workbench', 'browser'],
        application: recruit.app.Recruit
      }
    },
    recruit.action.CreateGlobalApplication
  )

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

  createAction(builder, { ...actionTemplates.archiveSpace, target: recruit.class.Vacancy })
  createAction(builder, { ...actionTemplates.unarchiveSpace, target: recruit.class.Vacancy })

  createAction(builder, {
    label: recruit.string.EditVacancy,
    icon: recruit.icon.Vacancy,
    action: view.actionImpl.ShowPanel,
    actionProps: {
      component: recruit.component.EditVacancy,
      element: 'content'
    },
    input: 'focus',
    category: recruit.category.Recruit,
    keyBinding: ['e'],
    target: recruit.class.Vacancy,
    context: {
      mode: ['context', 'browser']
    }
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class', 'title', 'source', 'city', 'skills', 'modifiedOn', 'onsite', 'remote']
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ClassFilters, {
    filters: ['attachedTo', 'assignee', 'state', 'doneState', 'modifiedOn']
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ClassFilters, {
    filters: ['company', 'location', 'dueTo']
  })

  createReviewModel(builder)

  // createAction(builder, { ...viewTemplates.open, target: recruit.class.Vacancy, context: { mode: ['browser', 'context'] } })

  createAction(builder, {
    ...viewTemplates.open,
    target: recruit.class.Vacancy,
    context: { mode: ['browser', 'context'] },
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'space'
    }
  })

  createAction(builder, {
    ...viewTemplates.open,
    target: recruit.class.Applicant,
    context: { mode: ['browser', 'context'] }
  })

  function createGotoSpecialAction (builder: Builder, id: string, key: KeyBinding, label: IntlString): void {
    createNavigateAction(builder, key, label, {
      application: recruit.app.Recruit as Ref<Application>,
      mode: 'special',
      special: id
    })
  }

  createGotoSpecialAction(builder, talentsId, 'g->e', recruit.string.GotoTalents)
  createGotoSpecialAction(builder, vacanciesId, 'g->v', recruit.string.GotoVacancies)
  createGotoSpecialAction(builder, skillsId, 'g->s', recruit.string.GotoSkills)
  createGotoSpecialAction(builder, assignedId, 'g->h', recruit.string.GotoAssigned)
  createGotoSpecialAction(builder, candidatesId, 'g->a', recruit.string.GotoApplicants)

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: recruit.app.Recruit as Ref<Application>,
      special: talentsId
    },
    label: recruit.string.GotoRecruitApplication,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })
}

export { recruitOperation } from './migration'
export { default } from './plugin'
