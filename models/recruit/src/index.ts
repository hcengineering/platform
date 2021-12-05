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
import type { Doc, Domain, FindOptions, Ref, Timestamp } from '@anticrm/core'
import { Builder, Model, Prop, TypeBoolean, TypeDate, TypeRef, TypeString, UX, Collection } from '@anticrm/model'
import chunter from '@anticrm/model-chunter'
import contact, { TPerson } from '@anticrm/model-contact'
import core, { TAttachedDoc, TDocWithState, TSpace, TSpaceWithStates } from '@anticrm/model-core'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type { Applicant, Candidate, Candidates, Vacancy } from '@anticrm/recruit'
import recruit from './plugin'

export const DOMAIN_RECRUIT = 'recruit' as Domain

@Model(recruit.class.Vacancy, core.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy)
export class TVacancy extends TSpaceWithStates implements Vacancy {
  @Prop(TypeString(), 'Full description' as IntlString)
  fullDescription?: string

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeDate(), 'Due date' as IntlString, recruit.icon.Calendar)
  dueTo?: Timestamp

  @Prop(TypeString(), 'Location' as IntlString, recruit.icon.Location)
  location?: string

  @Prop(TypeString(), 'Company' as IntlString, recruit.icon.Company)
  company?: string
}

@Model(recruit.class.Candidates, core.class.Space)
@UX(recruit.string.CandidatePools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Model(recruit.class.Candidate, contact.class.Person)
@UX('Candidate' as IntlString)
export class TCandidate extends TPerson implements Candidate {
  @Prop(TypeString(), 'Title' as IntlString)
  title?: string

  @Prop(Collection(chunter.class.Attachment), 'Attachments' as IntlString)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), 'Comments' as IntlString)
  comments?: number

  @Prop(Collection(recruit.class.Applicant), 'Applications' as IntlString)
  applications?: number

  @Prop(TypeBoolean(), 'Onsite' as IntlString)
  onsite?: boolean

  @Prop(TypeBoolean(), 'Remote' as IntlString)
  remote?: boolean

  @Prop(TypeString(), 'Source' as IntlString)
  source?: string
}

@Model(recruit.class.Applicant, core.class.AttachedDoc, DOMAIN_RECRUIT, [core.interface.DocWithState])
@UX('Application' as IntlString, recruit.icon.RecruitApplication, 'APP' as IntlString)
export class TApplicant extends TAttachedDoc implements Applicant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(recruit.class.Candidate), 'Candidate' as IntlString)
  declare attachedTo: Ref<Candidate>

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeString(), 'Comments' as IntlString)
  comments?: number

  @Prop(TypeRef(contact.class.Employee), 'Assigned recruiter' as IntlString)
  employee!: Ref<Employee> | null

  // We need this two to make typescript happy.
  declare state: TDocWithState['state']
  declare number: TDocWithState['number']
}

export function createModel (builder: Builder): void {
  builder.createModel(TVacancy, TCandidates, TCandidate, TApplicant)

  builder.mixin(recruit.class.Vacancy, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Applicant,
      createItemDialog: recruit.component.CreateApplication
    }
  })

  builder.mixin(recruit.class.Candidates, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: recruit.class.Candidate,
      createItemDialog: recruit.component.CreateCandidate
    }
  })

  builder.createDoc(workbench.class.Application, core.space.Model, {
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
        },
        {
          label: recruit.string.CandidatePools,
          spaceClass: recruit.class.Candidates,
          addSpaceLabel: recruit.string.CreateCandidates,
          createComponent: recruit.component.CreateCandidates
        }
      ]
    }
  })
  builder.createDoc(recruit.class.Candidates, core.space.Model, {
    name: 'public',
    description: 'Public Candidates',
    private: false,
    members: []
  }, recruit.space.CandidatesPublic)

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Candidate,
    descriptor: view.viewlet.Table,
    open: recruit.component.EditCandidate,
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
      { presenter: recruit.component.ApplicationsPresenter, label: 'Apps' },
      { presenter: chunter.component.AttachmentsPresenter, label: 'Files' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments' },
      'modifiedOn',
      'channels'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: view.viewlet.Table,
    open: recruit.component.EditCandidate,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.class.Candidate,
        state: core.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.state',
      '$lookup.attachedTo.city',
      { presenter: chunter.component.AttachmentsPresenter, label: 'Files' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments' },
      'modifiedOn',
      '$lookup.attachedTo.channels']
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: recruit.class.Applicant,
    descriptor: view.viewlet.Kanban,
    open: recruit.component.EditCandidate,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: recruit.class.Candidate,
        state: core.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: ['$lookup.attachedTo', '$lookup.state', '$lookup.attachedTo.city', '$lookup.attachedTo.channels']
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.KanbanCard, {
    card: recruit.component.KanbanCard
  })

  builder.mixin(recruit.class.Candidate, core.class.Class, view.mixin.ObjectEditor, {
    editor: recruit.component.EditCandidate
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, view.mixin.AttributePresenter, {
    presenter: recruit.component.ApplicationPresenter
  })

  builder.createDoc(view.class.Action, core.space.Model, {
    label: 'Create application' as IntlString,
    icon: recruit.icon.Create,
    action: recruit.actionImpl.CreateApplication
  }, recruit.action.CreateApplication)

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: recruit.class.Candidate,
    action: recruit.action.CreateApplication
  })

  builder.createDoc(view.class.Sequence, view.space.Sequence, {
    attachedTo: recruit.class.Applicant,
    sequence: 0
  })
}

export { default } from './plugin'
