//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Asset, type IntlString, type Plugin, plugin } from '@hcengineering/platform'
import {
  Doc,
  Mixin,
  type Class,
  type Permission,
  type Ref,
  type Role,
  type SpaceType,
  type SpaceTypeDescriptor,
  type Type,
  type TypedSpace
} from '@hcengineering/core'
import {
  type Training,
  type TrainingRequest,
  type TrainingAttempt,
  type TrainingAttemptState,
  TrainingState
} from './types'
import type { AnyComponent } from '@hcengineering/ui/src/types'

/** @public */
export const trainingId = 'training' as Plugin

export * from './types'

/** @public */
export default plugin(trainingId, {
  string: {
    Active: '' as IntlString,
    All: '' as IntlString,
    Canceled: '' as IntlString,
    ChangeOwner: '' as IntlString,
    Completed: '' as IntlString,
    CreateNewVersion: '' as IntlString,
    Duplicate: '' as IntlString,
    IncomingRequestStateCanceled: '' as IntlString,
    IncomingRequestStateDraft: '' as IntlString,
    IncomingRequestStateFailed: '' as IntlString,
    IncomingRequestStatePassed: '' as IntlString,
    IncomingRequestStatePending: '' as IntlString,
    NotSelected: '' as IntlString,
    Owner: '' as IntlString,
    Permission_ChangeSomeoneElsesSentRequestOwner: '' as IntlString,
    Permission_ChangeSomeoneElsesSentRequestOwner_Description: '' as IntlString,
    Permission_ChangeSomeoneElsesTrainingOwner: '' as IntlString,
    Permission_ChangeSomeoneElsesTrainingOwner_Description: '' as IntlString,
    Permission_CreateRequestOnSomeoneElsesTraining: '' as IntlString,
    Permission_CreateRequestOnSomeoneElsesTraining_Description: '' as IntlString,
    Permission_CreateTraining: '' as IntlString,
    Permission_CreateTraining_Description: '' as IntlString,
    Permission_ViewSomeoneElsesSentRequest: '' as IntlString,
    Permission_ViewSomeoneElsesSentRequest_Description: '' as IntlString,
    Permission_ViewSomeoneElsesTraineesResults: '' as IntlString,
    Permission_ViewSomeoneElsesTraineesResults_Description: '' as IntlString,
    Permission_ViewSomeoneElsesTrainingOverview: '' as IntlString,
    Permission_ViewSomeoneElsesTrainingOverview_Description: '' as IntlString,
    Permission_ViewSomeoneElsesTrainingQuestions: '' as IntlString,
    Permission_ViewSomeoneElsesTrainingQuestions_Description: '' as IntlString,
    Revision: '' as IntlString,
    SentYouATrainingRequest: '' as IntlString,
    State: '' as IntlString,
    Training: '' as IntlString,
    TrainingApplication: '' as IntlString,
    TrainingAttempt: '' as IntlString,
    TrainingAttempts: '' as IntlString,
    TrainingAttemptAssessmentsPassed: '' as IntlString,
    TrainingAttemptAssessmentsTotal: '' as IntlString,
    TrainingAttemptMyCurrentDraft: '' as IntlString,
    TrainingAttemptMyLatestResult: '' as IntlString,
    TrainingAttemptStateDraft: '' as IntlString,
    TrainingAttemptStateFailed: '' as IntlString,
    TrainingAttemptStatePassed: '' as IntlString,
    TrainingAttemptSubmit: '' as IntlString,
    TrainingAttemptSubmittedBy: '' as IntlString,
    TrainingAttemptSubmittedDate: '' as IntlString,
    TrainingAuthor: '' as IntlString,
    TrainingCreate: '' as IntlString,
    TrainingCreated: '' as IntlString,
    TrainingDocuments: '' as IntlString,
    TrainingOverview: '' as IntlString,
    TrainingPassingScore: '' as IntlString,
    TrainingPrefix: '' as IntlString,
    TrainingQuestions: '' as IntlString,
    TrainingRelease: '' as IntlString,
    TrainingReleasedBy: '' as IntlString,
    TrainingReleasedOn: '' as IntlString,
    TrainingRequest: '' as IntlString,
    TrainingRequestAssign: '' as IntlString,
    TrainingRequestAttempt: '' as IntlString,
    TrainingRequestCancel: '' as IntlString,
    TrainingRequestCanceledBy: '' as IntlString,
    TrainingRequestCanceledDate: '' as IntlString,
    TrainingRequestCompletion: '' as IntlString,
    TrainingRequestDueDate: '' as IntlString,
    TrainingRequestMaxAttempts: '' as IntlString,
    TrainingRequestNoDueDate: '' as IntlString,
    TrainingRequestResults: '' as IntlString,
    TrainingRequestRoles: '' as IntlString,
    TrainingRequestRolesCount: '' as IntlString,
    TrainingRequests: '' as IntlString,
    TrainingRequestTrainee: '' as IntlString,
    TrainingRequestTrainees: '' as IntlString,
    TrainingRetake: '' as IntlString,
    TrainingSeqNumber: '' as IntlString,
    TrainingStart: '' as IntlString,
    TrainingStateArchived: '' as IntlString,
    TrainingStateDeleted: '' as IntlString,
    TrainingStateDraft: '' as IntlString,
    TrainingStateReleased: '' as IntlString,
    TrainingTake: '' as IntlString,
    TrainingTitle: '' as IntlString,
    Trainings: '' as IntlString,
    ViewAllTrainings: '' as IntlString,
    ViewAllTrainingsAll: '' as IntlString,
    ViewAllTrainingsArchived: '' as IntlString,
    ViewAllTrainingsDrafts: '' as IntlString,
    ViewAllTrainingsReleased: '' as IntlString,
    ViewIncomingRequests: '' as IntlString,
    ViewMyResults: '' as IntlString,
    ViewMyTrainings: '' as IntlString,
    ViewMyTrainingsAll: '' as IntlString,
    ViewMyTrainingsArchived: '' as IntlString,
    ViewMyTrainingsDrafts: '' as IntlString,
    ViewMyTrainingsReleased: '' as IntlString,
    ViewSentRequests: '' as IntlString,
    ViewSettings: '' as IntlString,
    ViewTraineesResults: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  icon: {
    Cancel: '' as Asset,
    Duplicate: '' as Asset,
    Release: '' as Asset,
    Retry: '' as Asset,
    Training: '' as Asset,
    TrainingApplication: '' as Asset,
    TrainingRequest: '' as Asset,
    TrainingAttempt: '' as Asset,
    ViewAllTrainings: '' as Asset,
    ViewIncomingRequests: '' as Asset,
    ViewMyResults: '' as Asset,
    ViewMyTrainings: '' as Asset,
    ViewSentRequests: '' as Asset,
    ViewTraineesResults: '' as Asset
  },
  class: {
    Training: '' as Ref<Class<Training>>,
    TrainingRequest: '' as Ref<Class<TrainingRequest>>,
    TrainingAttempt: '' as Ref<Class<TrainingAttempt>>,
    TypeTrainingAttemptState: '' as Ref<Class<Type<TrainingAttemptState>>>,
    TypeTrainingState: '' as Ref<Class<Type<TrainingState>>>
  },
  permission: {
    ChangeSomeoneElsesSentRequestOwner: '' as Ref<Class<Permission>>,
    ChangeSomeoneElsesTrainingOwner: '' as Ref<Class<Permission>>,
    CreateRequestOnSomeoneElsesTraining: '' as Ref<Class<Permission>>,
    CreateTraining: '' as Ref<Class<Permission>>,
    ViewSomeoneElsesSentRequest: '' as Ref<Class<Permission>>,
    ViewSomeoneElsesTraineesResults: '' as Ref<Class<Permission>>,
    ViewSomeoneElsesTrainingOverview: '' as Ref<Class<Permission>>,
    ViewSomeoneElsesTrainingQuestions: '' as Ref<Class<Permission>>
  },
  mixin: {
    TrainingsTypeData: '' as Ref<Mixin<TypedSpace>>
  },
  space: {
    Trainings: '' as Ref<TypedSpace>
  },
  spaceType: {
    Trainings: '' as Ref<SpaceType>
  },
  spaceTypeDescriptor: {
    Trainings: '' as Ref<SpaceTypeDescriptor>
  },
  role: {
    QualifiedUser: '' as Ref<Role>,
    Manager: '' as Ref<Role>,
    QARA: '' as Ref<Role>
  },
  component: {
    Settings: '' as AnyComponent
  },
  setting: {
    Trainings: '' as Ref<Doc>
  }
})
