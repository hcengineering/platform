//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Employee } from '@anticrm/contact'
import { Doc, FindOptions, Ref, Timestamp } from '@anticrm/core'
import { Builder, Collection, Mixin, Model, Prop, TypeBoolean, TypeDate, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact, { TPerson } from '@anticrm/model-contact'
import core, { TSpace } from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import { Applicant, Candidate, Candidates, Vacancy } from '@anticrm/recruit'
import recruit from './plugin'
import presentation from '@anticrm/model-presentation'

@Model(recruit.class.Vacancy, task.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy)
export class TVacancy extends TSpaceWithStates implements Vacancy {
  @Prop(TypeString(), 'Full description' as IntlString)
  fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeDate(), 'Due date' as IntlString, recruit.icon.Calendar)
  dueTo?: Timestamp

  @Prop(TypeString(), 'Location' as IntlString, recruit.icon.Location)
  location?: string

  @Prop(TypeString(), 'Company' as IntlString, contact.icon.Company)
  company?: string
}

@Model(recruit.class.Candidates, core.class.Space)
@UX(recruit.string.CandidatePools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Mixin(recruit.mixin.Candidate, contact.class.Person)
@UX('Candidate' as IntlString, recruit.icon.RecruitApplication)
export class TCandidate extends TPerson implements Candidate {
  @Prop(TypeString(), 'Title' as IntlString)
  title?: string

  @Prop(Collection(recruit.class.Applicant), 'Applications' as IntlString)
  applications?: number

  @Prop(TypeBoolean(), 'Onsite' as IntlString)
  onsite?: boolean

  @Prop(TypeBoolean(), 'Remote' as IntlString)
  remote?: boolean

  @Prop(TypeString(), 'Source' as IntlString)
  source?: string
}

@Model(recruit.class.Applicant, task.class.Task)
@UX('Application' as IntlString, recruit.icon.Application, 'APP' as IntlString, 'number')
export class TApplicant extends TTask implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.mixin.Candidate), 'Candidate' as IntlString)
  declare attachedTo: Ref<Candidate>

  @Prop(Collection(attachment.class.Attachment), 'Attachments' as IntlString)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), 'Comments' as IntlString)
  comments?: number

  @Prop(TypeRef(contact.class.Employee), 'Assigned recruiter' as IntlString)
  declare assignee: Ref<Employee> | null
}

export function createModel (builder: Builder): void {
  builder.createModel(TVacancy, TCandidates, TCandidate, TApplicant)

  builder.mixin(recruit.class.Vacancy, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Applicant,
      createItemDialog: recruit.component.CreateApplication
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
            label: recruit.string.Vacancies,
            spaceClass: recruit.class.Vacancy,
            addSpaceLabel: recruit.string.CreateVacancy,
            createComponent: recruit.component.CreateVacancy,
            component: recruit.component.EditVacancy
          }
        ],
        specials: [
          {
            id: 'candidates',
            component: recruit.component.Candidates,
            icon: contact.icon.Person,
            label: recruit.string.Candidates,
            position: 'bottom'
          }
        ]
      }
    },
    recruit.app.Recruit
  )
  builder.createDoc(
    recruit.class.Candidates,
    core.space.Model,
    {
      name: 'public',
      description: 'Public Candidates',
      private: false,
      members: [],
      archived: false
    },
    recruit.space.CandidatesPublic
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.mixin.Candidate,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      // lookup: {
      //   resume: chunter.class.Attachment
      // }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      'title',
      'city',
      { presenter: recruit.component.ApplicationsPresenter, label: 'Apps', sortingKey: 'applications' },
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn',
      'channels'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State,
        assignee: contact.class.Employee,
        doneState: task.class.DoneState
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.assignee',
      '$lookup.state',
      '$lookup.doneState',
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn',
      '$lookup.attachedTo.channels'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: ['$lookup.attachedTo', '$lookup.state', '$lookup.attachedTo.city', '$lookup.attachedTo.channels']
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: task.viewlet.StatusTable,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.mixin.Candidate,
        state: task.class.State,
        assignee: contact.class.Employee,
        doneState: task.class.DoneState
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.assignee',
      '$lookup.state',
      '$lookup.doneState',
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn',
      '$lookup.attachedTo.channels'
    ]
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, task.mixin.KanbanCard, {
    card: recruit.component.KanbanCard
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditApplication
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ApplicationPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.ObjectValidator, {
    validator: recruit.validator.ApplicantValidator
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: 'Create application' as IntlString,
      icon: recruit.icon.Create,
      action: recruit.actionImpl.CreateApplication
    },
    recruit.action.CreateApplication
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: contact.class.Person,
    action: recruit.action.CreateApplication
  })

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.mixin.Candidate,
    action: task.action.CreateTask
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: 'Vacancies',
      description: 'Manage vacancy statuses',
      members: [],
      private: false,
      archived: false,
      icon: recruit.component.TemplatesIcon
    },
    recruit.space.VacancyTemplates
  )

  builder.createDoc(presentation.class.ObjectSearchCategory, core.space.Model, {
    icon: recruit.icon.Application,
    label: recruit.string.SearchApplication,
    query: recruit.completion.ApplicationQuery
  }, recruit.completion.ApplicationCategory)
}

export { default } from './plugin'
export { recruitOperation } from './migration'
export { createDeps } from './creation'
