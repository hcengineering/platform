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

import type { IntlString } from '@anticrm/platform'
import { Builder, Model, UX, Prop, TypeString, TypeBoolean } from '@anticrm/model'
import type { Ref, FindOptions, Doc, Domain, Class } from '@anticrm/core'
import core, { TSpace, TSpaceWithStates, TDocWithState } from '@anticrm/model-core'
import type { Vacancy, Candidates, Candidate, Applicant } from '@anticrm/recruit'
import activity from '@anticrm/activity'
import type { Employee } from '@anticrm/contact'

import workbench from '@anticrm/model-workbench'

import view from '@anticrm/model-view'
import contact, { TPerson } from '@anticrm/model-contact'
import recruit from './plugin'
import chunter from '@anticrm/model-chunter'

export const DOMAIN_RECRUIT = 'recruit' as Domain

@Model(recruit.class.Vacancy, core.class.SpaceWithStates)
@UX(recruit.string.Vacancy, recruit.icon.Vacancy)
export class TVacancy extends TSpaceWithStates implements Vacancy {}

@Model(recruit.class.Candidates, core.class.Space)
@UX(recruit.string.CandidatePools, recruit.icon.RecruitApplication)
export class TCandidates extends TSpace implements Candidates {}

@Model(recruit.class.Candidate, contact.class.Person)
@UX('Candidate' as IntlString)
export class TCandidate extends TPerson implements Candidate {
  @Prop(TypeString(), 'Title' as IntlString)
  title?: string

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeString(), 'Comments' as IntlString)
  comments?: number

  @Prop(TypeString(), 'Applications' as IntlString)
  applications?: number

  @Prop(TypeBoolean(), 'Onsite' as IntlString)
  onsite?: boolean

  @Prop(TypeBoolean(), 'Remote' as IntlString)
  remote?: boolean

  @Prop(TypeString(), 'Source' as IntlString)
  source?: string
}

@Model(recruit.class.Applicant, core.class.DocWithState, DOMAIN_RECRUIT)
@UX('Application' as IntlString, recruit.icon.RecruitApplication, 'APP' as IntlString)
export class TApplicant extends TDocWithState implements Applicant {
  @Prop(TypeString(), 'Candidate' as IntlString)
  attachedTo!: Ref<Candidate>

  attachedToClass!: Ref<Class<Candidate>>
  collection!: string

  @Prop(TypeString(), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeString(), 'Comments' as IntlString)
  comments?: number

  @Prop(TypeString(), 'Assigned recruiter' as IntlString)
  employee!: Ref<Employee>
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
          createComponent: recruit.component.CreateVacancy
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
    label: 'Create Application' as IntlString,
    icon: view.icon.Table,
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

  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: recruit.class.Applicant,
    icon: recruit.icon.RecruitApplication,
    txClass: core.class.TxUpdateDoc,
    component: recruit.activity.TxApplicantUpdate,
    display: 'inline'
  }, recruit.ids.TxApplicantUpdate)
}

export { default } from './plugin'
