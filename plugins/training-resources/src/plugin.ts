//
// Copyright © 2023 Hardcore Engineering Inc.
//

import training, { type Training, trainingId, type TrainingRequest } from '@hcengineering/training'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type ComponentType } from 'svelte'
import { type Ref } from '@hcengineering/core'
import {
  type Action,
  type GetAllValuesFunc,
  type ObjectTitle,
  type SortFunc,
  type ViewActionAvailabilityFunction,
  type ViewActionFunction,
  type ViewletDescriptor
} from '@hcengineering/view'
import type EmployeeEditor from './components/EmployeeEditor.svelte'
import type IncomingRequestPresenter from './components/IncomingRequestPresenter.svelte'
import type IncomingRequestStatePresenter from './components/IncomingRequestStatePresenter.svelte'
import type SentRequestCompletionPresenter from './components/SentRequestCompletionPresenter.svelte'
import type SentRequestPresenter from './components/SentRequestPresenter.svelte'
import type SentRequestStatePresenter from './components/SentRequestStatePresenter.svelte'
import type TrainingAttemptNumberPresenter from './components/TrainingAttemptNumberPresenter.svelte'
import type TrainingAttemptPanel from './components/TrainingAttemptPanel.svelte'
import type TrainingAttemptPresenter from './components/TrainingAttemptPresenter.svelte'
import type TrainingAttemptScorePresenter from './components/TrainingAttemptScorePresenter.svelte'
import type TrainingAttemptStateFilterPresenter from './components/TrainingAttemptStateFilterPresenter.svelte'
import type TrainingAttemptStatePresenter from './components/TrainingAttemptStatePresenter.svelte'
import type TrainingCodePresenter from './components/TrainingCodePresenter.svelte'
import type TrainingCreator from './components/TrainingCreator.svelte'
import type TrainingPanel from './components/TrainingPanel.svelte'
import type TrainingPassingScorePresenter from './components/TrainingPassingScorePresenter.svelte'
import type TrainingRequestDueDateEditor from './components/TrainingRequestDueDateEditor.svelte'
import type TrainingRequestMaxAttemptsEditor from './components/TrainingRequestMaxAttemptsEditor.svelte'
import type TrainingRequestMaxAttemptsPresenter from './components/TrainingRequestMaxAttemptsPresenter.svelte'
import type IncomingRequestAttemptsPresenter from './components/IncomingRequestAttemptsPresenter.svelte'
import type TrainingRequestNotificationPresenter from './components/TrainingRequestNotificationPresenter.svelte'
import type TrainingRequestPanel from './components/TrainingRequestPanel.svelte'
import type TrainingRequestTraineesEditor from './components/TrainingRequestTraineesEditor.svelte'
import type TrainingStateFilterPresenter from './components/TrainingStateFilterPresenter.svelte'
import type TrainingStatePresenter from './components/TrainingStatePresenter.svelte'
import type ViewAllTrainings from './components/ViewAllTrainings.svelte'
import type ViewIncomingRequests from './components/ViewIncomingRequests.svelte'
import type ViewMyResults from './components/ViewMyResults.svelte'
import type ViewMyTrainings from './components/ViewMyTrainings.svelte'
import type ViewSentRequests from './components/ViewSentRequests.svelte'
import type ViewTraineesResults from './components/ViewTraineesResults.svelte'

export default mergeIds(trainingId, training, {
  component: {
    EmployeeEditor: '' as Resource<ComponentType<EmployeeEditor>>,
    IncomingRequestAttemptsPresenter: '' as Resource<ComponentType<IncomingRequestAttemptsPresenter>>,
    IncomingRequestPresenter: '' as Resource<ComponentType<IncomingRequestPresenter>>,
    IncomingRequestStatePresenter: '' as Resource<ComponentType<IncomingRequestStatePresenter>>,
    SentRequestCompletionPresenter: '' as Resource<ComponentType<SentRequestCompletionPresenter>>,
    SentRequestPresenter: '' as Resource<ComponentType<SentRequestPresenter>>,
    SentRequestStatePresenter: '' as Resource<ComponentType<SentRequestStatePresenter>>,
    TrainingAttemptNumberPresenter: '' as Resource<ComponentType<TrainingAttemptNumberPresenter>>,
    TrainingAttemptPanel: '' as Resource<ComponentType<TrainingAttemptPanel>>,
    TrainingAttemptPresenter: '' as Resource<ComponentType<TrainingAttemptPresenter>>,
    TrainingAttemptScorePresenter: '' as Resource<ComponentType<TrainingAttemptScorePresenter>>,
    TrainingAttemptStateFilterPresenter: '' as Resource<ComponentType<TrainingAttemptStateFilterPresenter>>,
    TrainingAttemptStatePresenter: '' as Resource<ComponentType<TrainingAttemptStatePresenter>>,
    TrainingCodePresenter: '' as Resource<ComponentType<TrainingCodePresenter>>,
    TrainingCreator: '' as Resource<ComponentType<TrainingCreator>>,
    TrainingPanel: '' as Resource<ComponentType<TrainingPanel>>,
    TrainingPassingScorePresenter: '' as Resource<ComponentType<TrainingPassingScorePresenter>>,
    TrainingRequestDueDateEditor: '' as Resource<ComponentType<TrainingRequestDueDateEditor>>,
    TrainingRequestMaxAttemptsEditor: '' as Resource<ComponentType<TrainingRequestMaxAttemptsEditor>>,
    TrainingRequestMaxAttemptsPresenter: '' as Resource<ComponentType<TrainingRequestMaxAttemptsPresenter>>,
    TrainingRequestNotificationPresenter: '' as Resource<ComponentType<TrainingRequestNotificationPresenter>>,
    TrainingRequestPanel: '' as Resource<ComponentType<TrainingRequestPanel>>,
    TrainingRequestTraineesEditor: '' as Resource<ComponentType<TrainingRequestTraineesEditor>>,
    TrainingStateFilterPresenter: '' as Resource<ComponentType<TrainingStateFilterPresenter>>,
    TrainingStatePresenter: '' as Resource<ComponentType<TrainingStatePresenter>>,
    ViewAllTrainings: '' as Resource<ComponentType<ViewAllTrainings>>,
    ViewIncomingRequests: '' as Resource<ComponentType<ViewIncomingRequests>>,
    ViewMyTrainings: '' as Resource<ComponentType<ViewMyTrainings>>,
    ViewMyResults: '' as Resource<ComponentType<ViewMyResults>>,
    ViewSentRequests: '' as Resource<ComponentType<ViewSentRequests>>,
    ViewTraineesResults: '' as Resource<ComponentType<ViewTraineesResults>>
  },
  action: {
    TrainingChangeOwner: '' as Ref<Action<Training>>,
    TrainingChangeOwnerAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingChangeOwnerIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>,

    TrainingDelete: '' as Ref<Action<Training>>,
    TrainingDeleteAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingDeleteIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>,

    TrainingDraft: '' as Ref<Action<Training>>,
    TrainingDraftAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingDraftIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>,

    TrainingDuplicate: '' as Ref<Action<Training>>,
    TrainingDuplicateAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingDuplicateIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>,

    TrainingRelease: '' as Ref<Action<Training>>,
    TrainingReleaseAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingReleaseIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>,

    TrainingRequestCancel: '' as Ref<Action<TrainingRequest>>,
    TrainingRequestCancelAction: '' as Resource<ViewActionFunction<TrainingRequest>>,
    TrainingRequestCancelIsAvailable: '' as Resource<ViewActionAvailabilityFunction<TrainingRequest>>,

    TrainingRequestChangeOwner: '' as Ref<Action<TrainingRequest>>,
    TrainingRequestChangeOwnerAction: '' as Resource<ViewActionFunction<TrainingRequest>>,
    TrainingRequestChangeOwnerIsAvailable: '' as Resource<ViewActionAvailabilityFunction<TrainingRequest>>,

    TrainingRequestCreate: '' as Ref<Action<Training>>,
    TrainingRequestCreateAction: '' as Resource<ViewActionFunction<Training>>,
    TrainingRequestCreateIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Training>>
  },
  function: {
    TrainingAttemptStateSort: '' as SortFunc,
    TrainingAttemptStateAllValues: '' as GetAllValuesFunc,
    TrainingRequestObjectTitleProvider: '' as ObjectTitle['titleProvider'],
    TrainingStateSort: '' as SortFunc,
    TrainingStateAllValues: '' as GetAllValuesFunc
  },
  viewlet: {
    IncomingRequests: '' as Ref<ViewletDescriptor>,
    SentRequests: '' as Ref<ViewletDescriptor>,
    TrainingAttempts: '' as Ref<ViewletDescriptor>,
    TrainingIncomingRequests: '' as Ref<ViewletDescriptor>,
    TrainingSentRequests: '' as Ref<ViewletDescriptor>,
    TrainingAttemptsNested: '' as Ref<ViewletDescriptor>
  }
})
