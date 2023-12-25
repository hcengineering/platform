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
import { IndexKind, type Lookup, type Ref, SortingOrder, type Status, type Timestamp } from '@hcengineering/core'
import {
  type Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeCollaborativeMarkup,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import calendar from '@hcengineering/model-calendar'
import chunter from '@hcengineering/model-chunter'
import contact, { TOrganization, TPerson } from '@hcengineering/model-contact'
import core, { TAttachedDoc, TSpace } from '@hcengineering/model-core'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import presentation from '@hcengineering/model-presentation'
import tags from '@hcengineering/model-tags'
import task, { DOMAIN_TASK, TProject, TTask, actionTemplates } from '@hcengineering/model-task'
import tracker from '@hcengineering/model-tracker'
import view, { createAction, showColorsViewOption, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench, { type Application, createNavigateAction } from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { type IntlString, getEmbeddedLabel } from '@hcengineering/platform'
import {
  type Applicant,
  type ApplicantMatch,
  type Candidate,
  type Candidates,
  type Vacancy,
  type VacancyList,
  recruitId
} from '@hcengineering/recruit'
import setting from '@hcengineering/setting'
import { type KeyBinding, type ViewOptionModel, type ViewOptionsModel } from '@hcengineering/view'
import activity from '@hcengineering/activity'

import recruit from './plugin'
import { createReviewModel, reviewTableConfig, reviewTableOptions } from './review'
import { TOpinion, TReview } from './review-model'

export { recruitId } from '@hcengineering/recruit'
export { recruitOperation } from './migration'
export { default } from './plugin'

@Model(recruit.class.Vacancy, task.class.Project)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy, 'VCN', 'name')
export class TVacancy extends TProject implements Vacancy {
  @Prop(TypeCollaborativeMarkup(), recruit.string.FullDescription)
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

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number

  @Prop(TypeString(), recruit.string.Vacancy)
  @Index(IndexKind.FullText)
  @Hidden()
    number!: number
}

@Model(recruit.class.Candidates, core.class.Space)
@UX(recruit.string.TalentPools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Mixin(recruit.mixin.Candidate, contact.class.Person)
@UX(recruit.string.Talent, recruit.icon.RecruitApplication, 'TLNT', 'name')
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
@UX(recruit.string.VacancyList, recruit.icon.RecruitApplication, 'CM', 'name')
export class TVacancyList extends TOrganization implements VacancyList {
  @Prop(Collection(recruit.class.Vacancy), recruit.string.Vacancies)
    vacancies!: number
}

@Model(recruit.class.Applicant, task.class.Task)
@UX(recruit.string.Application, recruit.icon.Application, 'APP', 'number')
export class TApplicant extends TTask implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), recruit.string.Talent)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<Candidate>

  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Vacancy), recruit.string.Vacancy)
  @Index(IndexKind.Indexed)
  declare space: Ref<Vacancy>

  @Prop(TypeDate(), task.string.StartDate)
    startDate!: Timestamp | null

  @Prop(TypeRef(contact.mixin.Employee), recruit.string.AssignedRecruiter)
  @Index(IndexKind.Indexed)
  declare assignee: Ref<Employee> | null

  @Prop(TypeRef(core.class.Status), task.string.TaskState, { _id: recruit.attribute.State })
  @Index(IndexKind.Indexed)
  declare status: Ref<Status>
}

@Model(recruit.class.ApplicantMatch, core.class.AttachedDoc, DOMAIN_TASK)
@UX(recruit.string.Application, recruit.icon.Application, 'APP', 'number')
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

  builder.mixin(recruit.class.Vacancy, core.class.Class, activity.mixin.ActivityDoc, {
    ignoreCollections: ['comments']
  })
  builder.mixin(recruit.class.Applicant, core.class.Class, activity.mixin.ActivityDoc, {
    ignoreCollections: ['comments']
  })
  builder.mixin(recruit.class.Review, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(recruit.mixin.Candidate, core.class.Class, activity.mixin.ActivityDoc, {
    ignoreCollections: ['comments']
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: recruit.class.Vacancy,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: recruit.class.Applicant,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: recruit.class.Review,
    components: { input: chunter.component.ChatMessageInput }
  })

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

  builder.mixin(recruit.class.Vacancy, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy']
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: recruit.component.VacancyEditor
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy']
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
  const myApplicationsId = 'my-applications'
  const organizationsId = 'organizations'

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: recruit.string.RecruitApplication,
      icon: recruit.icon.RecruitApplication,
      locationResolver: recruit.resolver.Location,
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
            position: 'vacancy',
            componentProps: {
              archived: false
            }
          },
          {
            id: organizationsId,
            component: recruit.component.Organizations,
            icon: contact.icon.Company,
            label: recruit.string.Organizations,
            position: 'vacancy'
          },
          {
            id: candidatesId,
            component: task.component.TypesView,
            icon: recruit.icon.Application,
            label: recruit.string.Applications,
            componentProps: {
              _class: recruit.class.Applicant,
              label: recruit.string.Applications,
              createLabel: recruit.string.ApplicationCreateLabel,
              createComponent: recruit.component.CreateApplication,
              descriptor: recruit.descriptors.VacancyType,
              descriptors: [
                view.viewlet.Table,
                view.viewlet.List,
                task.viewlet.Kanban,
                recruit.viewlet.ApplicantDashboard
              ]
            },
            position: 'vacancy'
          },
          {
            id: talentsId,
            component: workbench.component.SpecialView,
            icon: recruit.icon.Talents,
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
            id: skillsId,
            component: recruit.component.SkillsView,
            icon: recruit.icon.Skills,
            label: recruit.string.SkillsLabel,
            createItemLabel: recruit.string.SkillCreateLabel,
            position: 'bottom'
          },
          {
            id: myApplicationsId,
            label: recruit.string.MyApplications,
            icon: recruit.icon.AssignedToMe,
            component: task.component.AssignedTasks,
            position: 'event',
            componentProps: {
              labelTasks: recruit.string.Applications,
              _class: recruit.class.Applicant,
              config: [
                ['assigned', view.string.Assigned, {}],
                ['created', view.string.Created, {}],
                ['subscribed', view.string.Subscribed, {}]
              ]
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

  createAction(
    builder,
    {
      ...actionTemplates.editStatus,
      target: recruit.class.Vacancy,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      override: [task.action.EditStatuses]
    },
    recruit.action.EditStatuses
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
          props: {
            kind: 'link'
          },
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
      configOptions: {
        hiddenKeys: ['name'],
        sortable: true
      },
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
      attachTo: recruit.class.Applicant,
      descriptor: view.viewlet.Table,
      config: ['', '$lookup.attachedTo', 'status', 'modifiedOn'],
      configOptions: {
        sortable: true
      },
      variant: 'short'
    },
    recruit.viewlet.VacancyApplicationsShort
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: view.viewlet.Table,
      config: ['', '$lookup.space.name', '$lookup.space.$lookup.company', 'status', 'comments'],
      configOptions: {
        sortable: true
      },
      variant: 'embedded'
    },
    recruit.viewlet.VacancyApplicationsEmbeddeed
  )

  // hiding arhived vacancies from vacancy view
  const vacancyHideArchivedOption: ViewOptionModel = {
    key: 'hideArchived',
    type: 'toggle',
    defaultValue: true,
    label: recruit.string.HideArchivedVacancies
  }

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
        'comments',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          props: {
            kind: 'link'
          },
          label: tracker.string.Issues
        },
        '$lookup.company',
        '$lookup.company.$lookup.channels',
        'location',
        'description',
        {
          key: '@applications.modifiedOn',
          label: core.string.ModifiedDate
        }
      ],
      configOptions: {
        hiddenKeys: ['name', 'space', 'modifiedOn'],
        sortable: true
      },
      viewOptions: {
        groupBy: [],
        orderBy: [],
        other: [vacancyHideArchivedOption]
      }
    },
    recruit.viewlet.TableVacancy
  )
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.mixin.VacancyList,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          label: recruit.string.Organizations
        },
        {
          key: '@vacancies',
          label: recruit.string.Vacancies
        },
        {
          key: '@applications',
          label: recruit.string.Applications
        },
        'comments',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues,
          props: { size: 'small', kind: 'link' }
        },
        '$lookup.channels',
        {
          key: '@applications.modifiedOn',
          label: core.string.ModifiedDate
        }
      ],
      configOptions: {
        hiddenKeys: ['name', 'space', 'modifiedOn'],
        sortable: true
      }
    },
    recruit.viewlet.TableVacancyList
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
          key: '$lookup.attachedTo',
          presenter: contact.component.PersonPresenter,
          sortingKey: '$lookup.attachedTo.name',
          label: recruit.string.Talent,
          props: {
            _class: recruit.mixin.Candidate
          }
        },
        'assignee',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          props: {
            kind: 'link'
          },
          label: tracker.string.Issues
        },
        'status',
        'attachments',
        'comments',
        'modifiedOn',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ],
      configOptions: {
        hiddenKeys: ['name', 'attachedTo'],
        sortable: true
      },
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
          key: '$lookup.attachedTo',
          presenter: contact.component.PersonPresenter,
          label: recruit.string.Talent,
          sortingKey: '$lookup.attachedTo.name',
          props: {
            _class: recruit.mixin.Candidate
          }
        },
        'assignee',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          props: {
            kind: 'link'
          },
          label: tracker.string.Issues
        },
        'status',
        'attachments',
        'comments',
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
          },
          space: recruit.class.Vacancy
        }
      },
      configOptions: {
        hiddenKeys: ['name', 'attachedTo'],
        sortable: true
      },
      baseQuery: {
        isDone: { $ne: true },
        '$lookup.space.archived': false
      }
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
      options: {
        lookup: {
          space: recruit.class.Vacancy
        }
      },
      baseQuery: {
        isDone: { $ne: true },
        '$lookup.space.archived': false
      }
    },
    recruit.viewlet.TableApplicantMatch
  )

  const applicantKanbanLookup: Lookup<Applicant> = {
    attachedTo: [
      recruit.mixin.Candidate,
      {
        _id: {
          channels: contact.class.Channel
        },
        space: recruit.class.Vacancy
      }
    ],
    _id: {
      related: [tracker.class.Issue, 'relations._id']
    }
  }

  const applicationDoneOption: ViewOptionModel = {
    key: 'hideDoneState',
    type: 'toggle',
    defaultValue: true,
    actionTarget: 'query',
    action: recruit.function.HideDoneState,
    label: recruit.string.HideDoneState
  }

  // hiding applicants related to archived vacancies from applicants view
  const hideApplicantsFromArchivedVacanciesOption: ViewOptionModel = {
    key: 'hideArchivedVacancies',
    type: 'toggle',
    defaultValue: true,
    actionTarget: 'query',
    action: recruit.function.HideArchivedVacancies,
    label: recruit.string.HideApplicantsFromArchivedVacancies
  }

  const applicantViewOptions = (colors: boolean, hides: boolean): ViewOptionsModel => {
    const model: ViewOptionsModel = {
      groupBy: ['status', 'assignee', 'space', 'createdBy', 'modifiedBy'],
      orderBy: [
        ['status', SortingOrder.Ascending],
        ['modifiedOn', SortingOrder.Descending],
        ['createdOn', SortingOrder.Descending],
        ['dueDate', SortingOrder.Ascending],
        ['rank', SortingOrder.Ascending]
      ],
      other: [
        {
          key: 'shouldShowAll',
          type: 'toggle',
          defaultValue: false,
          actionTarget: 'category',
          action: view.function.ShowEmptyGroups,
          label: view.string.ShowEmptyGroups
        }
      ]
    }
    if (colors) {
      model.other.push(showColorsViewOption)
    }
    if (hides) {
      model.other.push(...[applicationDoneOption, hideApplicantsFromArchivedVacanciesOption])
    }
    return model
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: view.viewlet.List,
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'app' } },
        {
          key: 'status',
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        {
          key: '$lookup.attachedTo',
          presenter: contact.component.PersonPresenter,
          label: recruit.string.Talent,
          sortingKey: '$lookup.attachedTo.name',
          props: {
            _class: recruit.mixin.Candidate
          }
        },
        { key: 'attachments', displayProps: { key: 'attachments', suffix: true } },
        { key: 'comments', displayProps: { key: 'comments', suffix: true } },
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues,
          props: { size: 'small' }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.space.company',
          displayProps: { fixed: 'left', key: 'company' },
          props: {
            maxWidth: '10rem'
          }
        },
        {
          key: '$lookup.attachedTo.$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels'],
          props: {
            length: 'full',
            size: 'small',
            kind: 'list'
          },
          displayProps: { compression: true }
        },
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right', dividerBefore: true } },
        {
          key: 'assignee',
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' },
          displayProps: { key: 'assignee', fixed: 'right' }
        },
        {
          key: '',
          label: recruit.string.DueDate,
          presenter: tracker.component.DueDatePresenter,
          displayProps: { key: 'dueDate', compression: true },
          props: { kind: 'list' }
        }
      ],
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          },
          space: recruit.class.Vacancy
        }
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['name', 'attachedTo']
      },
      viewOptions: applicantViewOptions(true, true)
    },
    recruit.viewlet.ListApplicant
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.mixin.Candidate,
      descriptor: view.viewlet.List,
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'app' } },
        {
          key: 'title',
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        'comments',
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', '$lookup.attachedTo.channels'],
          props: {
            length: 'full',
            size: 'small',
            kind: 'list'
          },
          displayProps: { compression: true }
        },
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right', dividerBefore: true } }
      ],
      configOptions: {
        strict: true,
        hiddenKeys: ['name']
      },
      viewOptions: {
        groupBy: ['createdBy', 'modifiedBy'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending],
          ['rank', SortingOrder.Ascending]
        ],
        other: [showColorsViewOption]
      }
    },
    recruit.viewlet.ListTalent
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.mixin.VacancyList,
      descriptor: view.viewlet.List,
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'app' } },
        {
          key: '@vacancies',
          label: recruit.string.Vacancies,
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        {
          key: '@applications',
          label: recruit.string.Applications,
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        'comments',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues,
          props: { size: 'small' }
        },
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', '$lookup.attachedTo.channels'],
          props: {
            length: 'full',
            size: 'small',
            kind: 'list'
          },
          displayProps: { compression: true }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '@applications.modifiedOn',
          label: core.string.ModifiedDate,
          displayProps: { key: 'modified', fixed: 'right', dividerBefore: true }
        }
      ],
      configOptions: {
        strict: true,
        sortable: true,
        hiddenKeys: ['name', 'space', 'modifiedOn']
      },
      viewOptions: {
        groupBy: ['createdBy', 'modifiedBy'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending],
          ['rank', SortingOrder.Ascending]
        ],
        other: [showColorsViewOption]
      }
    },
    recruit.viewlet.ListCompanies
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Vacancy,
      descriptor: view.viewlet.List,
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'app' } },
        {
          key: '@applications',
          label: recruit.string.Applications
        },
        'description',
        'comemnts',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Issues
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.company',
          displayProps: { key: '$lookup.company', fixed: 'right' }
        },
        {
          key: 'location',
          displayProps: { key: 'location', fixed: 'right' }
        }
      ],
      configOptions: {
        strict: true,
        hiddenKeys: ['name', 'space', 'modifiedOn']
      },
      baseQuery: {
        '$lookup.space.archived': false
      },
      viewOptions: {
        groupBy: ['company', 'dueTo', 'createdBy'],
        orderBy: [
          ['company', SortingOrder.Ascending],
          ['dueTo', SortingOrder.Ascending],
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: [vacancyHideArchivedOption]
      }
    },
    recruit.viewlet.ListVacancy
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: task.viewlet.Kanban,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      baseQuery: {
        isDone: { $ne: true },
        '$lookup.space.archived': false
      },
      viewOptions: {
        ...applicantViewOptions(false, false),
        groupDepth: 1
      },
      options: {
        lookup: applicantKanbanLookup
      },
      configOptions: {
        strict: true
      },
      config: [
        '',
        'space',
        'assignee',
        'status',
        'attachments',
        'dueDate',
        'comments',
        {
          key: 'company',
          label: recruit.string.Company
        },
        {
          key: 'channels',
          label: contact.string.ContactInfo
        }
      ]
    },
    recruit.viewlet.ApplicantKanban
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: recruit.class.Applicant,
      descriptor: task.viewlet.Dashboard,
      options: {},
      config: []
    },
    recruit.viewlet.ApplicantDashboard
  )

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
    titleProvider: recruit.function.AppTitleProvider
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: recruit.function.AppIdentifierProvider
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: recruit.function.RevTitleProvider
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: recruit.function.VacTitleProvider
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetObjectLinkFragment
  })

  builder.mixin(recruit.class.Opinion, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetObjectLinkFragment
  })

  builder.mixin(recruit.class.Review, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetObjectLinkFragment
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetObjectLinkFragment
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetIdObjectLinkFragment
  })

  builder.mixin(recruit.mixin.VacancyList, core.class.Class, view.mixin.LinkProvider, {
    encode: recruit.function.GetIdObjectLinkFragment
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
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: recruit.icon.Application,
      label: recruit.string.SearchApplication,
      title: recruit.string.Applications,
      query: recruit.completion.ApplicationQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: recruit.class.Applicant
    },
    recruit.completion.ApplicationCategory
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: recruit.icon.Vacancy,
      label: recruit.string.SearchVacancy,
      title: recruit.string.Vacancies,
      query: recruit.completion.VacancyQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: recruit.class.Vacancy
    },
    recruit.completion.VacancyCategory
  )

  createAction(builder, { ...actionTemplates.archiveSpace, target: recruit.class.Vacancy })
  createAction(builder, { ...actionTemplates.unarchiveSpace, target: recruit.class.Vacancy })

  createAction(builder, {
    label: view.string.Open,
    icon: view.icon.Open,
    action: view.actionImpl.ShowPanel,
    actionProps: {
      component: recruit.component.EditVacancy,
      element: 'content'
    },
    input: 'focus',
    category: recruit.category.Recruit,
    override: [view.action.Open],
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

  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectPanel, {
    component: recruit.component.EditVacancy
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

  builder.mixin(recruit.mixin.VacancyList, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  createReviewModel(builder)

  createAction(builder, {
    ...viewTemplates.open,
    label: recruit.string.ShowApplications,
    icon: recruit.icon.Application,
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

  createGotoSpecialAction(builder, talentsId, 'keyG->keyE', recruit.string.GotoTalents)
  createGotoSpecialAction(builder, vacanciesId, 'keyG->keyV', recruit.string.GotoVacancies)
  createGotoSpecialAction(builder, skillsId, 'keyG->keyS', recruit.string.GotoSkills)
  createGotoSpecialAction(builder, myApplicationsId, 'keyG->keyM', recruit.string.GotoMyApplications)
  createGotoSpecialAction(builder, candidatesId, 'keyG->keyA', recruit.string.GotoApplicants)

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
      _class: contact.mixin.Employee,
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
    action: task.actionImpl.SelectStatus,
    actionPopup: task.component.StatusSelector,
    actionProps: {
      _class: core.class.Status,
      ofAttribute: recruit.attribute.State,
      placeholder: task.string.TaskState
    },
    label: task.string.TaskState,
    icon: task.icon.TaskState,
    keyBinding: ['keyS->keyS'],
    input: 'any',
    category: recruit.category.Recruit,
    target: recruit.class.Applicant,
    context: {
      mode: ['context'],
      application: recruit.app.Recruit,
      group: 'edit'
    }
  })

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: recruit.function.IdProvider
      },
      label: recruit.string.CopyId,
      icon: view.icon.CopyId,
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
        textProvider: recruit.function.GetObjectLink
      },
      label: recruit.string.CopyLink,
      icon: view.icon.CopyLink,
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
        textProvider: recruit.function.GetObjectLink
      },
      label: recruit.string.CopyLink,
      icon: view.icon.CopyLink,
      keyBinding: [],
      input: 'none',
      category: recruit.category.Recruit,
      target: recruit.class.Vacancy,
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

  builder.mixin(recruit.class.Applicant, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: recruit.component.NotificationApplicantPresenter
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: recruit.string.Application,
      icon: recruit.icon.Application,
      objectClass: recruit.class.Applicant
    },
    recruit.ids.ApplicationNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: task.string.AssignedToMe,
      group: recruit.ids.ApplicationNotificationGroup,
      field: 'assignee',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: recruit.class.Applicant,
      templates: {
        textTemplate: '{doc} was assigned to you by {sender}',
        htmlTemplate: '<p>{doc} was assigned to you by {sender}</p>',
        subjectTemplate: '{doc} was assigned to you'
      },
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.EmailNotification]: true
      }
    },
    recruit.ids.AssigneeNotification
  )

  generateClassNotificationTypes(
    builder,
    recruit.class.Applicant,
    recruit.ids.ApplicationNotificationGroup,
    [],
    ['comments', 'status', 'dueDate']
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: recruit.string.Vacancy,
      icon: recruit.icon.Vacancy,
      objectClass: recruit.class.Vacancy
    },
    recruit.ids.VacancyNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: recruit.string.CreateApplication,
      group: recruit.ids.VacancyNotificationGroup,
      field: 'space',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: recruit.class.Applicant,
      spaceSubscribe: true,
      providers: {
        [notification.providers.PlatformNotification]: false
      }
    },
    recruit.ids.ApplicationCreateNotification
  )

  generateClassNotificationTypes(builder, recruit.class.Vacancy, recruit.ids.VacancyNotificationGroup, [], ['comments'])

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: recruit.string.Talent,
      icon: recruit.icon.CreateCandidate,
      objectClass: recruit.mixin.Candidate
    },
    recruit.ids.CandidateNotificationGroup
  )

  generateClassNotificationTypes(
    builder,
    recruit.mixin.Candidate,
    recruit.ids.CandidateNotificationGroup,
    ['vacancyMatch'],
    ['comments']
  )

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

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      objectClass: recruit.class.Vacancy,
      label: chunter.string.LeftComment
    },
    recruit.ids.VacancyChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      objectClass: recruit.class.Applicant,
      label: chunter.string.LeftComment
    },
    recruit.ids.ApplicantChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      objectClass: recruit.class.Review,
      label: chunter.string.LeftComment
    },
    recruit.ids.ReviewChatMessageViewlet
  )

  // Allow to use fuzzy search for mixins
  builder.mixin(recruit.class.Vacancy, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    propagate: []
  })

  builder.mixin(recruit.mixin.Candidate, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    propagate: [recruit.class.Applicant],
    propagateClasses: [
      tags.class.TagReference,
      chunter.class.ChatMessage,
      attachment.class.Attachment,
      contact.class.Channel
    ]
  })

  // Allow to use fuzzy search for mixins
  builder.mixin(recruit.class.Applicant, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true,
    forceIndex: true,
    propagate: []
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
      label: tracker.string.RelatedIssues
    }
  })
  builder.mixin(recruit.class.Vacancy, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: tracker.string.RelatedIssues
    }
  })
  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: tracker.string.RelatedIssues
    }
  })

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: recruit.class.Applicant,
      action: 'update',
      config: {
        status: {
          iconPresenter: task.component.StateIconPresenter
        }
      }
    },
    recruit.ids.ApplicantUpdatedActivityViewlet
  )

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

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: recruit.function.GetTalentId
      },
      label: recruit.string.GetTalentIds,
      icon: view.icon.CopyId,
      keyBinding: [],
      input: 'any',
      category: recruit.category.Recruit,
      target: recruit.mixin.Candidate,
      context: {
        mode: ['context', 'browser'],
        application: recruit.app.Recruit,
        group: 'copy'
      }
    },
    recruit.action.GetTalentIds
  )

  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: recruit.string.RecruitApplication,
      description: recruit.string.ManageVacancyStatuses,
      icon: recruit.component.TemplatesIcon,
      editor: recruit.component.VacancyTemplateEditor,
      baseClass: recruit.class.Vacancy
    },
    recruit.descriptors.VacancyType
  )

  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: recruit.class.Applicant,
      allowCreate: true,
      description: recruit.string.Application,
      icon: recruit.icon.Application,
      name: recruit.string.Application
    },
    recruit.descriptors.Application
  )
}
