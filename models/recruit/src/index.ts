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

import type { Employee, Organization } from '@hcengineering/contact'
import { Doc, FindOptions, IndexKind, Lookup, Ref, Timestamp } from '@hcengineering/core'
import {
  Builder,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import calendar from '@hcengineering/model-calendar'
import chunter from '@hcengineering/model-chunter'
import contact, { TOrganization, TPerson } from '@hcengineering/model-contact'
import core, { TAttachedDoc, TSpace } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import tags from '@hcengineering/model-tags'
import task, { actionTemplates, DOMAIN_TASK, TSpaceWithStates, TTask } from '@hcengineering/model-task'
import tracker from '@hcengineering/model-tracker'
import view, { actionTemplates as viewTemplates, createAction } from '@hcengineering/model-view'
import workbench, { Application, createNavigateAction } from '@hcengineering/model-workbench'
import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
import {
  Applicant,
  ApplicantMatch,
  Candidate,
  Candidates,
  recruitId,
  Vacancy,
  VacancyList
} from '@hcengineering/recruit'
import setting from '@hcengineering/setting'
import { KeyBinding } from '@hcengineering/view'
import recruit from './plugin'
import { createReviewModel, reviewTableConfig, reviewTableOptions } from './review'
import { TOpinion, TReview } from './review-model'

@Model(recruit.class.Vacancy, task.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy, undefined, 'name')
export class TVacancy extends TSpaceWithStates implements Vacancy {
  @Prop(TypeMarkup(), recruit.string.FullDescription)
  @Index(IndexKind.FullText)
    fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeDate(), recruit.string.Due, recruit.icon.Calendar)
    dueTo?: Timestamp

  @Prop(TypeString(), recruit.string.Location, recruit.icon.Location)
  @Index(IndexKind.FullText)
    location?: string

  @Prop(TypeRef(contact.class.Organization), recruit.string.Company, { icon: contact.icon.Company })
    company?: Ref<Organization>

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(Collection(chunter.class.Backlink), chunter.string.Comments)
    relations!: number
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

  @Prop(Collection(recruit.class.Applicant), recruit.string.Applications, {
    shortLabel: recruit.string.ApplicationsShort
  })
    applications?: number

  @Prop(TypeBoolean(), recruit.string.Onsite)
    onsite?: boolean

  @Prop(TypeBoolean(), recruit.string.Remote)
    remote?: boolean

  @Prop(TypeString(), recruit.string.Source)
  @Index(IndexKind.FullText)
    source?: string

  @Prop(Collection(tags.class.TagReference, recruit.string.SkillLabel), recruit.string.SkillsLabel, {
    icon: recruit.icon.Skills,
    schema: '3'
  })
    skills?: number

  @Prop(Collection(recruit.class.Review, recruit.string.Review), recruit.string.Reviews)
    reviews?: number

  @Prop(
    Collection(recruit.class.ApplicantMatch, getEmbeddedLabel('Vacancy match')),
    getEmbeddedLabel('Vacancy Matches')
  )
    vacancyMatch?: number
}

@Mixin(recruit.mixin.VacancyList, contact.class.Organization)
@UX(recruit.string.VacancyList, recruit.icon.RecruitApplication, undefined, 'name')
export class TVacancyList extends TOrganization implements VacancyList {
  @Prop(Collection(recruit.class.Vacancy), recruit.string.Vacancies)
    vacancies!: number
}

@Model(recruit.class.Applicant, task.class.Task)
@UX(recruit.string.Application, recruit.icon.Application, recruit.string.ApplicationShort, 'number')
export class TApplicant extends TTask implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Talent)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<Candidate>

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Vacancy), recruit.string.Vacancy)
  @Index(IndexKind.Indexed)
  declare space: Ref<Vacancy>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(TypeRef(contact.class.Employee), recruit.string.AssignedRecruiter)
  declare assignee: Ref<Employee> | null

  @Prop(TypeTimestamp(), contact.string.CreatedOn)
  @ReadOnly()
    createOn!: Timestamp
}

@Model(recruit.class.ApplicantMatch, core.class.AttachedDoc, DOMAIN_TASK)
@UX(recruit.string.Application, recruit.icon.Application, recruit.string.ApplicationShort, 'number')
export class TApplicantMatch extends TAttachedDoc implements ApplicantMatch {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Talent)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<Candidate>

  @Prop(TypeBoolean(), getEmbeddedLabel('Complete'))
  @ReadOnly()
    complete!: boolean

  @Prop(TypeString(), getEmbeddedLabel('Vacancy'))
  @ReadOnly()
    vacancy!: string

  @Prop(TypeString(), getEmbeddedLabel('Summary'))
  @ReadOnly()
    summary!: string

  @Prop(TypeMarkup(), getEmbeddedLabel('Response'))
  @ReadOnly()
    response!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TVacancy, TCandidates, TCandidate, TApplicant, TReview, TOpinion, TVacancyList, TApplicantMatch)

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

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.CollectionEditor, {
    editor: recruit.component.VacancyList
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Mixin, view.mixin.ObjectFactory, {
    component: recruit.component.CreateCandidate
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, setting.mixin.Editable, {
    value: true
  })
  builder.mixin(recruit.mixin.VacancyList, core.class.Class, setting.mixin.Editable, {
    value: false
  })

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
      alias: recruitId,
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
              createComponent: recruit.component.CreateCandidate,
              createComponentProps: { shouldSaveDraft: false }
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
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Relations
        },
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
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', 'channels']
        }
      ],
      hiddenKeys: ['name'],
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          }
        }
      }
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
        '$lookup.company.$lookup.channels',
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
        {
          key: 'attachedTo',
          presenter: contact.component.PersonRefPresenter,
          sortingKey: 'attachedTo',
          label: recruit.string.Talent,
          props: {
            _class: recruit.mixin.Candidate
          }
        },
        'assignee',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues
        },
        'state',
        'doneState',
        'attachments',
        'comments',
        'modifiedOn',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ],
      hiddenKeys: ['name', 'attachedTo'],
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          }
        }
      }
    },
    recruit.viewlet.TableApplicant
  )
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: view.viewlet.Table,
      config: [
        '',
        {
          key: 'attachedTo',
          presenter: contact.component.PersonRefPresenter,
          label: recruit.string.Talent,
          sortingKey: 'attachedTo',
          props: {
            _class: recruit.mixin.Candidate
          }
        },
        'assignee',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues
        },
        'state',
        'comments',
        'attachments',
        'modifiedOn',
        '$lookup.space.company',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ],
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          }
        }
      },
      hiddenKeys: ['name', 'attachedTo']
    },
    recruit.viewlet.ApplicantTable
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.ApplicantMatch,
      descriptor: view.viewlet.Table,
      config: ['', 'response', 'attachedTo', 'space', 'modifiedOn'],
      hiddenKeys: []
    },
    recruit.viewlet.TableApplicantMatch
  )

  const applicantKanbanLookup: Lookup<Applicant> = {
    attachedTo: [
      recruit.mixin.Candidate,
      {
        _id: {
          channels: contact.class.Channel
        }
      }
    ],
    assignee: contact.class.Employee,
    _id: {
      related: [tracker.class.Issue, 'relations._id']
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

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: task.viewlet.Dashboard,
    options: {},
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

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: recruit.component.ApplicationPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: recruit.component.ApplicationsPresenter
  })

  builder.mixin(recruit.class.ApplicantMatch, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: recruit.component.ApplicationMatchPresenter
  })

  builder.mixin(recruit.class.ApplicantMatch, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: recruit.component.ApplicationMatchPresenter
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectPresenter, {
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
      element: 'top',
      props: {
        preserveCandidate: true
      },
      fillProps: {
        _id: 'candidate'
      }
    },
    label: recruit.string.CreateAnApplication,
    icon: recruit.icon.Create,
    input: 'focus',
    category: recruit.category.Recruit,
    target: contact.class.Person,
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
    },
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
    keyBinding: ['keyC'],
    input: 'none',
    category: recruit.category.Recruit,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser'],
      application: recruit.app.Recruit,
      group: 'create'
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
      application: recruit.app.Recruit,
      group: 'create'
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
        application: recruit.app.Recruit,
        group: 'create'
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
      icon: recruit.component.TemplatesIcon,
      editor: recruit.component.VacancyTemplateEditor
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

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: recruit.icon.Vacancy,
      label: recruit.string.SearchVacancy,
      query: recruit.completion.VacancyQuery
    },
    recruit.completion.VacancyCategory
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
    keyBinding: ['keyE'],
    target: recruit.class.Vacancy,
    context: {
      mode: ['context', 'browser'],
      group: 'create'
    }
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class']
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ClassFilters, {
    filters: ['attachedTo']
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  createReviewModel(builder)

  createAction(builder, {
    ...viewTemplates.open,
    target: recruit.class.Vacancy,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'space'
    }
  })

  createAction(builder, {
    ...viewTemplates.open,
    target: recruit.class.Applicant,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    }
  })

  createAction(builder, {
    ...viewTemplates.open,
    target: recruit.class.ApplicantMatch,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    }
  })

  function createGotoSpecialAction (builder: Builder, id: string, key: KeyBinding, label: IntlString): void {
    createNavigateAction(builder, key, label, recruit.app.Recruit as Ref<Application>, {
      application: recruitId,
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
      application: recruitId,
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

  createAction(builder, {
    action: view.actionImpl.ValueSelector,
    actionPopup: view.component.ValueSelector,
    actionProps: {
      attribute: 'assignee',
      _class: contact.class.Employee,
      query: {},
      placeholder: recruit.string.AssignRecruiter
    },
    label: recruit.string.AssignRecruiter,
    icon: contact.icon.Person,
    keyBinding: [],
    input: 'none',
    category: recruit.category.Recruit,
    target: recruit.class.Applicant,
    context: {
      mode: ['context'],
      application: recruit.app.Recruit,
      group: 'edit'
    }
  })

  createAction(builder, {
    action: view.actionImpl.ValueSelector,
    actionPopup: view.component.ValueSelector,
    actionProps: {
      attribute: 'state',
      _class: task.class.State,
      query: {},
      searchField: 'title',
      // should match space
      fillQuery: { space: 'space' },
      // Only apply for same vacancy
      docMatches: ['space'],
      placeholder: task.string.TaskState
    },
    label: task.string.TaskState,
    icon: task.icon.TaskState,
    keyBinding: [],
    input: 'none',
    category: recruit.category.Recruit,
    target: recruit.class.Applicant,
    context: {
      mode: ['context'],
      application: recruit.app.Recruit,
      group: 'edit'
    }
  })
  // TODO: fix icons
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: recruit.function.GetApplicationId
      },
      label: recruit.string.CopyId,
      icon: recruit.icon.Application,
      keyBinding: [],
      input: 'none',
      category: recruit.category.Recruit,
      target: recruit.class.Applicant,
      context: {
        mode: ['context', 'browser'],
        application: recruit.app.Recruit,
        group: 'copy'
      }
    },
    recruit.action.CopyApplicationId
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: recruit.function.GetApplicationLink
      },
      label: recruit.string.CopyLink,
      icon: recruit.icon.Application,
      keyBinding: [],
      input: 'none',
      category: recruit.category.Recruit,
      target: recruit.class.Applicant,
      context: {
        mode: ['context', 'browser'],
        application: recruit.app.Recruit,
        group: 'copy'
      }
    },
    recruit.action.CopyApplicationLink
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: recruit.function.GetRecruitLink
      },
      label: recruit.string.CopyLink,
      icon: recruit.icon.Application,
      keyBinding: [],
      input: 'none',
      category: recruit.category.Recruit,
      target: contact.class.Person,
      context: {
        mode: ['context', 'browser'],
        application: recruit.app.Recruit,
        group: 'copy'
      }
    },
    recruit.action.CopyCandidateLink
  )

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributeFilter, {
    component: recruit.component.ApplicantFilter
  })

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: recruit.string.HasActiveApplicant,
      result: recruit.function.HasActiveApplicant,
      disableValueSelector: true
    },
    recruit.filter.HasActive
  )

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: recruit.string.HasNoActiveApplicant,
      result: recruit.function.HasNoActiveApplicant,
      disableValueSelector: true
    },
    recruit.filter.NoActive
  )
  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: recruit.string.NoneApplications,
      result: recruit.function.NoneApplications,
      disableValueSelector: true
    },
    recruit.filter.None
  )

  // Allow to use fuzzy search for mixins
  builder.mixin(recruit.class.Vacancy, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    propogate: []
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    propogate: [recruit.class.Applicant]
  })

  // Allow to use fuzzy search for mixins
  builder.mixin(recruit.class.Applicant, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    forceIndex: true,
    propogate: []
  })

  createAction(builder, {
    label: recruit.string.MatchVacancy,
    icon: recruit.icon.Vacancy,
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: recruit.component.MatchVacancy,
      element: 'top',
      fillProps: {
        _objects: 'objects'
      }
    },
    input: 'any',
    category: recruit.category.Recruit,
    keyBinding: [],
    target: recruit.mixin.Candidate,
    context: {
      mode: ['context', 'browser'],
      group: 'create'
    }
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: recruit.string.RelatedIssues
    }
  })
  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: recruit.string.RelatedIssues
    }
  })
  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: recruit.string.RelatedIssues
    }
  })

  createAction(
    builder,
    {
      label: view.string.Move,
      action: recruit.actionImpl.MoveApplicant,
      icon: view.icon.Move,
      input: 'any',
      category: view.category.General,
      target: recruit.class.Applicant,
      context: {
        mode: ['context', 'browser'],
        group: 'tools'
      },
      override: [task.action.Move]
    },
    recruit.action.MoveApplicant
  )
}

export { recruitOperation } from './migration'
export { default } from './plugin'
