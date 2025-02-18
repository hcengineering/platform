//
// Copyright © 2024 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import notification, { type NotificationType } from '@hcengineering/notification'
import { type Asset, type IntlString } from '@hcengineering/platform'
import type { BuildModelKey, Viewlet, ViewletDescriptor } from '@hcengineering/view'
import questions from '@hcengineering/model-questions'
import contact from '@hcengineering/contact'
import tracker from '@hcengineering/model-tracker'
import attachment from '@hcengineering/model-attachment'
import print from '@hcengineering/model-print'
import setting, { getRoleAttributeProps } from '@hcengineering/setting'
import {
  type Training,
  type TrainingAttempt,
  trainingId,
  type TrainingRequest,
  TrainingSpecialIds
} from '@hcengineering/training'

import { AccountRole, type Data, type FindOptions, type Permission, type Ref } from '@hcengineering/core'
import { Prop, type Builder } from '@hcengineering/model'

import contacts from '@hcengineering/model-contact'
import core from '@hcengineering/model-core'
import view, { classPresenter, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import training from './plugin'
import {
  TTraining,
  TTrainingAttempt,
  TTrainingAttemptState,
  TTrainingRequest,
  TTrainingState,
  TTrainingsTypeData
} from './types'
import { roles } from './roles'
export { trainingOperation } from './migration'
export { trainingId } from '@hcengineering/training/src/index'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  defineBase(builder)
  defineSpaceType(builder)
  defineTraining(builder)
  defineTrainingRequest(builder)
  defineTrainingAttempt(builder)
  defineApplication(builder)
  defineSettings(builder)
}

function defineBase (builder: Builder): void {
  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    {
      label: training.string.TrainingApplication,
      visible: true
    },
    training.actionCategory.Training
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: training.string.TrainingApplication,
      icon: training.icon.TrainingApplication
    },
    training.notification.TrainingGroup
  )

  builder.createDoc(notification.class.ActivityNotificationViewlet, core.space.Model, {
    messageMatch: {
      _class: activity.class.DocUpdateMessage,
      objectClass: training.class.TrainingRequest
    },
    presenter: training.component.TrainingRequestNotificationPresenter
  })
}

function defineSpaceType (builder: Builder): void {
  for (const role of roles) {
    const { label, roleType } = getRoleAttributeProps(role.name)

    Prop(roleType, label)(TTrainingsTypeData.prototype, role._id)
  }

  builder.createModel(TTrainingsTypeData)

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: training.string.TrainingApplication,
      description: training.string.TrainingApplication,
      icon: training.icon.TrainingApplication,
      baseClass: core.class.TypedSpace,
      availablePermissions: [
        training.permission.CreateTraining,
        training.permission.ChangeSomeoneElsesTrainingOwner,
        training.permission.ViewSomeoneElsesTrainingOverview,
        training.permission.ViewSomeoneElsesTrainingQuestions,
        training.permission.CreateRequestOnSomeoneElsesTraining,
        training.permission.ChangeSomeoneElsesSentRequestOwner,
        training.permission.ViewSomeoneElsesSentRequest,
        training.permission.ViewSomeoneElsesTraineesResults
      ]
    },
    training.spaceTypeDescriptor.Trainings
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default Trainings',
      descriptor: training.spaceTypeDescriptor.Trainings,
      roles: roles.length,
      targetClass: training.mixin.TrainingsTypeData
    },
    training.spaceType.Trainings
  )

  for (const role of roles) {
    builder.createDoc(
      core.class.Role,
      core.space.Model,
      {
        attachedTo: training.spaceType.Trainings,
        attachedToClass: core.class.SpaceType,
        collection: 'roles',
        name: role.name,
        permissions: role.permissions
      },
      role._id
    )
  }
}

function defineTraining (builder: Builder): void {
  builder.createModel(TTrainingState)

  builder.mixin(training.class.TypeTrainingState, core.class.Class, view.mixin.SortFuncs, {
    func: training.function.TrainingStateSort
  })

  builder.mixin(training.class.TypeTrainingState, core.class.Class, view.mixin.AllValuesFunc, {
    func: training.function.TrainingStateAllValues
  })

  builder.mixin(training.class.TypeTrainingState, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: training.component.TrainingStateFilterPresenter
  })

  builder.mixin(training.class.TypeTrainingState, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  classPresenter(builder, training.class.TypeTrainingState, training.component.TrainingStatePresenter)

  builder.createModel(TTraining)

  builder.mixin(training.class.Training, core.class.Class, view.mixin.LinkProvider, {
    encode: training.function.TrainingLinkProviderEncode
  })

  builder.mixin(training.class.Training, core.class.Class, view.mixin.ObjectPanel, {
    component: training.component.TrainingPanel
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: training.class.Training,
    descriptor: view.viewlet.Table,
    config: [
      {
        key: '',
        sortingKey: 'seqNumber',
        label: training.string.Training,
        presenter: training.component.TrainingCodePresenter
      },
      {
        ...columns.trainingTitle,
        key: 'title'
      },
      {
        ...columns.trainingRevision,
        key: 'revision',
        sortingKey: 'revision'
      },
      {
        key: 'state',
        sortingKey: 'state',
        displayProps: { align: 'center' }
      },
      {
        key: '',
        sortingKey: 'passingScore',
        label: training.string.TrainingPassingScore,
        presenter: training.component.TrainingPassingScorePresenter,
        displayProps: { align: 'center' }
      },
      {
        key: 'attachments',
        label: attachment.string.Attachments,
        props: {
          canAdd: false,
          canRemove: false
        },
        displayProps: { align: 'center' }
      },
      {
        key: 'requests',
        label: training.string.TrainingRequests,
        presenter: view.component.NumberPresenter,
        displayProps: { align: 'center' }
      },
      'modifiedOn',
      {
        ...columns.owner,
        key: 'owner'
      }
    ],
    configOptions: {
      strict: true,
      sortable: true
    }
  })

  builder.mixin(training.class.Training, core.class.Class, view.mixin.ClassFilters, {
    filters: ['revision', 'state', 'modifiedOn'] as Array<keyof Training>,
    strict: true
  })

  builder.mixin(training.class.Training, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, tracker.action.NewRelatedIssue, print.action.Print]
  })

  createAction(
    builder,
    {
      action: training.action.TrainingChangeOwnerAction,
      visibilityTester: training.action.TrainingChangeOwnerIsAvailable,
      input: 'focus',
      label: training.string.ChangeOwner,
      icon: contact.icon.Person,
      target: training.class.Training,
      context: { mode: ['context'], group: 'edit' },
      category: training.actionCategory.Training
    },
    training.action.TrainingChangeOwner
  )

  createAction(
    builder,
    {
      action: training.action.TrainingReleaseAction,
      visibilityTester: training.action.TrainingReleaseIsAvailable,
      input: 'focus',
      label: training.string.TrainingRelease,
      icon: training.icon.Release,
      target: training.class.Training,
      context: { mode: ['context'], group: 'edit' },
      category: training.actionCategory.Training
    },
    training.action.TrainingRelease
  )

  createAction(
    builder,
    {
      action: training.action.TrainingDuplicateAction,
      visibilityTester: training.action.TrainingDuplicateIsAvailable,
      input: 'focus',
      label: training.string.Duplicate,
      icon: training.icon.Duplicate,
      target: training.class.Training,
      context: { mode: ['context'], group: 'copy' },
      category: training.actionCategory.Training
    },
    training.action.TrainingDuplicate
  )

  createAction(
    builder,
    {
      action: training.action.TrainingDraftAction,
      visibilityTester: training.action.TrainingDraftIsAvailable,
      input: 'focus',
      label: training.string.CreateNewVersion,
      icon: training.icon.Duplicate,
      target: training.class.Training,
      context: { mode: ['context'], group: 'copy' },
      category: training.actionCategory.Training
    },
    training.action.TrainingDraft
  )

  createAction(
    builder,
    {
      action: training.action.TrainingRequestCreateAction,
      visibilityTester: training.action.TrainingRequestCreateIsAvailable,
      input: 'focus',
      label: training.string.TrainingRequestAssign,
      icon: training.icon.ViewSentRequests,
      target: training.class.Training,
      context: { mode: ['context'], group: 'tools' },
      category: training.actionCategory.Training
    },
    training.action.TrainingRequestCreate
  )

  createAction(
    builder,
    {
      override: [view.action.Delete],
      action: training.action.TrainingDeleteAction,
      visibilityTester: training.action.TrainingDeleteIsAvailable,
      input: 'focus',
      label: view.string.Delete,
      icon: view.icon.Delete,
      target: training.class.Training,
      context: { mode: ['context'], group: 'remove' },
      category: training.actionCategory.Training
    },
    training.action.TrainingDelete
  )

  definePermission(builder, training.permission.ChangeSomeoneElsesTrainingOwner, {
    label: training.string.Permission_ChangeSomeoneElsesTrainingOwner,
    description: training.string.Permission_ChangeSomeoneElsesTrainingOwner_Description
  })
  definePermission(builder, training.permission.CreateTraining, {
    label: training.string.Permission_CreateTraining,
    description: training.string.Permission_CreateTraining_Description
  })
  definePermission(builder, training.permission.ViewSomeoneElsesTrainingOverview, {
    label: training.string.Permission_ViewSomeoneElsesTrainingOverview,
    description: training.string.Permission_ViewSomeoneElsesTrainingOverview_Description
  })
  definePermission(builder, training.permission.ViewSomeoneElsesTrainingQuestions, {
    label: training.string.Permission_ViewSomeoneElsesTrainingQuestions,
    description: training.string.Permission_ViewSomeoneElsesTrainingQuestions_Description
  })
}

function defineTrainingRequest (builder: Builder): void {
  builder.createModel(TTrainingRequest)

  builder.mixin(training.class.TrainingRequest, core.class.Class, view.mixin.LinkProvider, {
    encode: training.function.TrainingRequestLinkProviderEncode
  })

  builder.mixin(training.class.TrainingRequest, core.class.Class, view.mixin.ObjectPanel, {
    component: training.component.TrainingRequestPanel
  })

  const columnSeqNumber: BuildModelKey = {
    key: '',
    sortingKey: '$lookup.attachedTo.seqNumber',
    label: training.string.Training,
    presenter: training.component.SentRequestPresenter
  }
  const columnTrainingTitle: BuildModelKey = {
    ...columns.trainingTitle,
    key: '$lookup.attachedTo.title'
  }
  const columnTrainingRevision: BuildModelKey = {
    ...columns.trainingRevision,
    key: '$lookup.attachedTo.revision',
    sortingKey: '$lookup.attachedTo.revision'
  }
  const columnSentState: BuildModelKey = {
    key: '',
    sortingKey: 'canceledOn',
    presenter: training.component.SentRequestStatePresenter,
    label: training.string.State,
    displayProps: { align: 'center' }
  }
  const columnIncomingState: BuildModelKey = {
    key: '',
    label: training.string.State,
    presenter: training.component.IncomingRequestStatePresenter,
    displayProps: { align: 'center' }
  }
  const columnCompletion: BuildModelKey = {
    key: '',
    label: training.string.TrainingRequestCompletion,
    presenter: training.component.SentRequestCompletionPresenter
  }
  const columnIncomingAttempts: BuildModelKey = {
    key: '',
    label: training.string.TrainingAttempts,
    presenter: training.component.IncomingRequestAttemptsPresenter,
    displayProps: { align: 'center' }
  }
  const columnMaxAttempts: BuildModelKey = {
    key: 'maxAttempts',
    label: training.string.TrainingRequestMaxAttempts,
    presenter: training.component.TrainingRequestMaxAttemptsPresenter,
    displayProps: { align: 'center' }
  }
  const columnDueDate: BuildModelKey = {
    key: 'dueDate',
    label: training.string.TrainingRequestDueDate,
    presenter: training.component.TrainingRequestDueDateEditor
  }
  const columnOwner: BuildModelKey = {
    ...columns.owner,
    key: 'owner'
  }
  const requestsViewletData: Omit<Data<Viewlet>, 'descriptor' | 'config'> = {
    attachTo: training.class.TrainingRequest,
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    options: {
      lookup: {
        attachedTo: training.class.Training
      }
    } as FindOptions<TrainingRequest>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    configOptions: {
      strict: true,
      sortable: true
    }
  }

  ;(function defineSentRequest () {
    defineTableBrowserViewletDescriptor(
      builder,
      training.icon.ViewSentRequests,
      training.string.ViewSentRequests,
      training.viewlet.SentRequests
    )
    const sentRequestsViewletData: Data<Viewlet> = {
      ...requestsViewletData,
      config: [
        columnSeqNumber,
        columnTrainingTitle,
        columnTrainingRevision,
        columnSentState,
        columnCompletion,
        'createdOn',
        columnMaxAttempts,
        columnDueDate,
        columnOwner
      ],
      descriptor: training.viewlet.SentRequests
    }
    builder.createDoc(view.class.Viewlet, core.space.Model, sentRequestsViewletData)

    defineTableBrowserViewletDescriptor(
      builder,
      training.icon.ViewSentRequests,
      training.string.ViewSentRequests,
      training.viewlet.TrainingSentRequests
    )
    const trainingSentRequestsViewletData: Data<Viewlet> = {
      ...sentRequestsViewletData,
      descriptor: training.viewlet.TrainingSentRequests,
      config: sentRequestsViewletData.config.filter(
        (column) => column !== columnTrainingTitle && column !== columnTrainingRevision
      )
    }
    builder.createDoc(view.class.Viewlet, core.space.Model, trainingSentRequestsViewletData)

    definePermission(builder, training.permission.ChangeSomeoneElsesSentRequestOwner, {
      label: training.string.Permission_ChangeSomeoneElsesSentRequestOwner,
      description: training.string.Permission_ChangeSomeoneElsesSentRequestOwner_Description
    })
    definePermission(builder, training.permission.CreateRequestOnSomeoneElsesTraining, {
      label: training.string.Permission_CreateRequestOnSomeoneElsesTraining,
      description: training.string.Permission_CreateRequestOnSomeoneElsesTraining_Description
    })
    definePermission(builder, training.permission.ViewSomeoneElsesSentRequest, {
      label: training.string.Permission_ViewSomeoneElsesSentRequest,
      description: training.string.Permission_ViewSomeoneElsesSentRequest_Description
    })
  })()
  ;(function defineIncomingRequest () {
    defineTableBrowserViewletDescriptor(
      builder,
      training.icon.ViewIncomingRequests,
      training.string.ViewIncomingRequests,
      training.viewlet.IncomingRequests
    )
    const incomingRequestsViewletData: Data<Viewlet> = {
      ...requestsViewletData,
      descriptor: training.viewlet.IncomingRequests,
      config: [
        columnSeqNumber,
        columnTrainingTitle,
        columnTrainingRevision,
        columnIncomingAttempts,
        columnIncomingState,
        'createdOn',
        columnDueDate,
        columnOwner
      ]
    }
    builder.createDoc(view.class.Viewlet, core.space.Model, incomingRequestsViewletData)

    defineTableBrowserViewletDescriptor(
      builder,
      training.icon.ViewIncomingRequests,
      training.string.ViewIncomingRequests,
      training.viewlet.TrainingIncomingRequests
    )
    const trainingIncomingRequestsViewletData: Data<Viewlet> = {
      ...incomingRequestsViewletData,
      descriptor: training.viewlet.TrainingIncomingRequests,
      config: incomingRequestsViewletData.config.filter(
        (column) => column !== columnTrainingTitle && column !== columnTrainingRevision
      )
    }
    builder.createDoc(view.class.Viewlet, core.space.Model, trainingIncomingRequestsViewletData)
  })()

  builder.mixin(training.class.TrainingRequest, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, tracker.action.NewRelatedIssue, print.action.Print]
  })

  createAction(
    builder,
    {
      action: training.action.TrainingRequestChangeOwnerAction,
      visibilityTester: training.action.TrainingRequestChangeOwnerIsAvailable,
      input: 'focus',
      label: training.string.ChangeOwner,
      icon: contact.icon.Person,
      target: training.class.TrainingRequest,
      context: { mode: ['context'], group: 'edit' },
      category: training.actionCategory.Training
    },
    training.action.TrainingRequestChangeOwner
  )

  createAction(
    builder,
    {
      action: training.action.TrainingRequestCancelAction,
      visibilityTester: training.action.TrainingRequestCancelIsAvailable,
      input: 'focus',
      label: training.string.TrainingRequestCancel,
      icon: training.icon.Cancel,
      target: training.class.TrainingRequest,
      context: { mode: ['context'], group: 'remove' },
      category: training.actionCategory.Training
    },
    training.action.TrainingRequestCancel
  )

  builder.mixin(training.class.TrainingRequest, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(training.class.TrainingRequest, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: training.function.TrainingRequestObjectTitleProvider
  })

  builder.mixin(training.class.TrainingRequest, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['trainees'] as Array<keyof TrainingRequest>
  })

  builder.createDoc<NotificationType>(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: true,
      label: training.string.TrainingRequest,
      group: training.notification.TrainingGroup,
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: training.class.TrainingRequest,
      defaultEnabled: true,
      templates: {
        textTemplate: '{sender} sent you a training request {doc}',
        htmlTemplate: '<p><b>{sender}</b> sent you a training request {doc}</p>',
        subjectTemplate: 'Training request {doc}'
      }
    },
    training.notification.TrainingRequest
  )
}

function defineTrainingAttempt (builder: Builder): void {
  builder.createModel(TTrainingAttemptState)

  builder.mixin(training.class.TypeTrainingAttemptState, core.class.Class, view.mixin.SortFuncs, {
    func: training.function.TrainingAttemptStateSort
  })

  builder.mixin(training.class.TypeTrainingAttemptState, core.class.Class, view.mixin.AllValuesFunc, {
    func: training.function.TrainingAttemptStateAllValues
  })

  builder.mixin(training.class.TypeTrainingAttemptState, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: training.component.TrainingAttemptStateFilterPresenter
  })

  builder.mixin(training.class.TypeTrainingAttemptState, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  classPresenter(builder, training.class.TypeTrainingAttemptState, training.component.TrainingAttemptStatePresenter)

  builder.createModel(TTrainingAttempt)

  builder.mixin(training.class.TrainingAttempt, core.class.Class, view.mixin.LinkProvider, {
    encode: training.function.TrainingAttemptLinkProviderEncode
  })

  builder.mixin(training.class.TrainingAttempt, core.class.Class, view.mixin.ObjectPanel, {
    component: training.component.TrainingAttemptPanel
  })

  const columnTrainingSeqNumber: BuildModelKey = {
    key: '',
    sortingKey: '$lookup.attachedTo.$lookup.attachedTo.seqNumber',
    label: training.string.Training,
    presenter: training.component.TrainingAttemptPresenter
  }
  const columnTrainingTitle: BuildModelKey = {
    ...columns.trainingTitle,
    key: '$lookup.attachedTo.$lookup.attachedTo.title'
  }
  const columnTrainingRevision: BuildModelKey = {
    ...columns.trainingRevision,
    key: '$lookup.attachedTo.$lookup.attachedTo.revision',
    sortingKey: '$lookup.attachedTo.$lookup.attachedTo.revision'
  }
  const columnAttemptSeqNumber: BuildModelKey = {
    key: '',
    sortingKey: 'seqNumber',
    label: training.string.TrainingAttempt,
    presenter: training.component.TrainingAttemptNumberPresenter,
    displayProps: { align: 'center' }
  }
  const columnScore: BuildModelKey = {
    key: '',
    sortingKey: 'score',
    presenter: training.component.TrainingAttemptScorePresenter,
    label: questions.string.Score
  }
  const columnState: BuildModelKey = {
    key: 'state',
    sortingKey: 'state',
    displayProps: { align: 'center' }
  }
  const columnSubmittedBy: BuildModelKey = {
    key: 'submittedBy',
    label: training.string.TrainingAttemptSubmittedBy,
    presenter: contacts.component.EmployeePresenter,
    props: { shouldShowName: true },
    displayProps: { align: 'center' }
  }

  defineTableBrowserViewletDescriptor(
    builder,
    training.icon.TrainingAttempt,
    training.string.TrainingAttempts,
    training.viewlet.TrainingAttempts
  )
  const trainingAttemptsViewletData: Omit<Data<Viewlet>, 'descriptor'> = {
    attachTo: training.class.TrainingAttempt,
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    options: {
      lookup: {
        attachedTo: [
          training.class.TrainingRequest,
          {
            attachedTo: training.class.Training
          }
        ]
      }
    } as FindOptions<TrainingAttempt>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    config: [
      columnTrainingSeqNumber,
      columnTrainingTitle,
      columnTrainingRevision,
      columnAttemptSeqNumber,
      columnState,
      columnScore,
      'createdOn',
      'submittedOn',
      columnSubmittedBy
    ],
    configOptions: {
      strict: true,
      sortable: true
    }
  }
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    ...trainingAttemptsViewletData,
    descriptor: training.viewlet.TrainingAttempts
  })

  defineTableBrowserViewletDescriptor(
    builder,
    training.icon.TrainingAttempt,
    training.string.TrainingAttempts,
    training.viewlet.TrainingAttemptsNested
  )
  builder.createDoc(view.class.Viewlet, core.space.Model, {
    ...trainingAttemptsViewletData,
    descriptor: training.viewlet.TrainingAttemptsNested,
    config: trainingAttemptsViewletData.config.filter(
      (column) => column !== columnTrainingTitle && column !== columnTrainingRevision
    )
  })

  builder.mixin(training.class.TrainingAttempt, core.class.Class, view.mixin.ClassFilters, {
    filters: ['state', 'submittedBy', 'submittedOn'] as Array<keyof TrainingAttempt>,
    strict: true
  })

  builder.mixin(training.class.TrainingAttempt, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, tracker.action.NewRelatedIssue, print.action.Print]
  })

  definePermission(builder, training.permission.ViewSomeoneElsesTraineesResults, {
    label: training.string.Permission_ViewSomeoneElsesTraineesResults,
    description: training.string.Permission_ViewSomeoneElsesTraineesResults_Description
  })
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: training.string.TrainingApplication,
      icon: training.icon.TrainingApplication,
      alias: trainingId,
      hidden: false,
      locationResolver: training.resolver.Location,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: TrainingSpecialIds.AllTrainings,
            icon: training.icon.ViewAllTrainings,
            label: training.string.ViewAllTrainings,
            position: '00:common',
            component: training.component.ViewAllTrainings,
            componentProps: {
              _class: training.class.Training,
              icon: training.icon.ViewAllTrainings,
              label: training.string.ViewAllTrainings
            }
          },
          {
            id: TrainingSpecialIds.IncomingRequests,
            icon: training.icon.ViewIncomingRequests,
            label: training.string.ViewIncomingRequests,
            position: '10:trainee',
            component: training.component.ViewIncomingRequests,
            componentProps: {
              _class: training.class.TrainingRequest,
              icon: training.icon.ViewIncomingRequests,
              label: training.string.ViewIncomingRequests,
              descriptors: [training.viewlet.IncomingRequests]
            }
          },
          {
            id: TrainingSpecialIds.MyResults,
            icon: training.icon.ViewMyResults,
            label: training.string.ViewMyResults,
            position: '10:trainee',
            component: training.component.ViewMyResults,
            componentProps: {
              _class: training.class.TrainingAttempt,
              icon: training.icon.ViewMyResults,
              label: training.string.ViewMyResults,
              descriptors: [training.viewlet.TrainingAttempts]
            }
          },
          {
            id: TrainingSpecialIds.MyTrainings,
            icon: training.icon.ViewMyTrainings,
            label: training.string.ViewMyTrainings,
            position: '20:trainer',
            component: training.component.ViewMyTrainings,
            componentProps: {
              _class: training.class.Training,
              icon: training.icon.ViewMyTrainings,
              label: training.string.ViewMyTrainings
            }
          },
          {
            id: TrainingSpecialIds.SentRequests,
            icon: training.icon.ViewSentRequests,
            label: training.string.ViewSentRequests,
            position: '20:trainer',
            component: training.component.ViewSentRequests,
            componentProps: {
              _class: training.class.TrainingRequest,
              icon: training.icon.ViewSentRequests,
              label: training.string.ViewSentRequests,
              descriptors: [training.viewlet.SentRequests]
            }
          },
          {
            id: TrainingSpecialIds.TraineesResults,
            icon: training.icon.TrainingAttempt,
            label: training.string.ViewTraineesResults,
            position: '20:trainer',
            component: training.component.ViewTraineesResults,
            componentProps: {
              _class: training.class.TrainingAttempt,
              icon: training.icon.TrainingAttempt,
              label: training.string.ViewTraineesResults,
              descriptors: [training.viewlet.TrainingAttempts]
            }
          }
        ]
      }
    },
    training.app.Training
  )
}

function definePermission (builder: Builder, id: Ref<Permission>, data: Data<Permission>): void {
  builder.createDoc(core.class.Permission, core.space.Model, data, id)
}

function defineTableBrowserViewletDescriptor (
  builder: Builder,
  icon: Asset,
  label: IntlString,
  ref: Ref<ViewletDescriptor>
): void {
  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      icon,
      label,
      component: view.component.TableBrowser
    },
    ref
  )
}

function defineSettings (builder: Builder): void {
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'trainings',
      label: training.string.Trainings,
      icon: training.icon.Training,
      component: training.component.Settings,
      order: 1150,
      role: AccountRole.Maintainer
    },
    training.setting.Trainings
  )
}

const columns = {
  trainingTitle: {
    key: 'title',
    label: training.string.TrainingTitle,
    props: { accent: true },
    displayProps: { grow: true, align: 'left' }
  },
  trainingRevision: {
    key: 'revision',
    label: training.string.Revision,
    presenter: view.component.NumberPresenter,
    displayProps: { align: 'center' }
  },
  owner: {
    key: 'owner',
    label: training.string.Owner,
    presenter: contacts.component.EmployeePresenter,
    props: { shouldShowName: true },
    displayProps: { align: 'center' }
  }
} as const
