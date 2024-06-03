//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Resources } from '@hcengineering/platform'
import { trainingChangeOwnerAction } from './actions/trainingChangeOwnerAction'
import { trainingDraftAction } from './actions/trainingDraftAction'
import { trainingDeleteAction } from './actions/trainingDeleteAction'
import { trainingDuplicateAction } from './actions/trainingDuplicateAction'
import { trainingReleaseAction } from './actions/trainingReleaseAction'
import { trainingRequestCancelAction } from './actions/trainingRequestCancelAction'
import { trainingRequestChangeOwnerAction } from './actions/trainingRequestChangeOwnerAction'
import { trainingRequestCreateAction } from './actions/trainingRequestCreateAction'
import EmployeeEditor from './components/EmployeeEditor.svelte'
import IncomingRequestAttemptsPresenter from './components/IncomingRequestAttemptsPresenter.svelte'
import IncomingRequestPresenter from './components/IncomingRequestPresenter.svelte'
import IncomingRequestStatePresenter from './components/IncomingRequestStatePresenter.svelte'
import SentRequestCompletionPresenter from './components/SentRequestCompletionPresenter.svelte'
import SentRequestPresenter from './components/SentRequestPresenter.svelte'
import SentRequestStatePresenter from './components/SentRequestStatePresenter.svelte'
import TrainingAttemptNumberPresenter from './components/TrainingAttemptNumberPresenter.svelte'
import TrainingAttemptPanel from './components/TrainingAttemptPanel.svelte'
import TrainingAttemptPresenter from './components/TrainingAttemptPresenter.svelte'
import TrainingAttemptScorePresenter from './components/TrainingAttemptScorePresenter.svelte'
import TrainingAttemptStateFilterPresenter from './components/TrainingAttemptStateFilterPresenter.svelte'
import TrainingAttemptStatePresenter from './components/TrainingAttemptStatePresenter.svelte'
import TrainingCodePresenter from './components/TrainingCodePresenter.svelte'
import TrainingCreator from './components/TrainingCreator.svelte'
import TrainingPanel from './components/TrainingPanel.svelte'
import TrainingPassingScorePresenter from './components/TrainingPassingScorePresenter.svelte'
import TrainingRequestDueDateEditor from './components/TrainingRequestDueDateEditor.svelte'
import TrainingRequestMaxAttemptsEditor from './components/TrainingRequestMaxAttemptsEditor.svelte'
import TrainingRequestMaxAttemptsPresenter from './components/TrainingRequestMaxAttemptsPresenter.svelte'
import TrainingRequestNotificationPresenter from './components/TrainingRequestNotificationPresenter.svelte'
import TrainingRequestPanel from './components/TrainingRequestPanel.svelte'
import TrainingRequestTraineesEditor from './components/TrainingRequestTraineesEditor.svelte'
import TrainingStateFilterPresenter from './components/TrainingStateFilterPresenter.svelte'
import TrainingStatePresenter from './components/TrainingStatePresenter.svelte'
import ViewAllTrainings from './components/ViewAllTrainings.svelte'
import ViewIncomingRequests from './components/ViewIncomingRequests.svelte'
import ViewMyResults from './components/ViewMyResults.svelte'
import ViewMyTrainings from './components/ViewMyTrainings.svelte'
import ViewSentRequests from './components/ViewSentRequests.svelte'
import ViewTraineesResults from './components/ViewTraineesResults.svelte'
import Settings from './components/Settings.svelte'
import { trainingAttemptLinkProviderEncode } from './functions/trainingAttemptLinkProviderEncode'
import { trainingAttemptStateAllValues } from './functions/trainingAttemptStateAllValues'
import { trainingAttemptStateSort } from './functions/trainingAttemptStateSort'
import { trainingLinkProviderEncode } from './functions/trainingLinkProviderEncode'
import { trainingRequestLinkProviderEncode } from './functions/trainingRequestLinkProviderEncode'
import { trainingRequestObjectTitleProvider } from './functions/trainingRequestObjectTitleProvider'
import { trainingStateAllValues } from './functions/trainingStateAllValues'
import { trainingStateSort } from './functions/trainingStateSort'
import { resolveLocation } from './routing/resolveLocation'

export { default as NullablePositiveNumberEditor } from './components/NullablePositiveNumberEditor.svelte'
export { default as TrainingRefEditor } from './components/TrainingRefEditor.svelte'
export { default as TrainingRequestRolesEditor } from './components/TrainingRequestRolesEditor.svelte'

export default async (): Promise<Resources> => ({
  component: {
    EmployeeEditor,
    IncomingRequestAttemptsPresenter,
    IncomingRequestPresenter,
    IncomingRequestStatePresenter,
    SentRequestCompletionPresenter,
    SentRequestPresenter,
    SentRequestStatePresenter,
    TrainingAttemptNumberPresenter,
    TrainingAttemptPanel,
    TrainingAttemptPresenter,
    TrainingAttemptScorePresenter,
    TrainingAttemptStateFilterPresenter,
    TrainingAttemptStatePresenter,
    TrainingCodePresenter,
    TrainingCreator,
    TrainingPanel,
    TrainingPassingScorePresenter,
    TrainingRequestDueDateEditor,
    TrainingRequestMaxAttemptsEditor,
    TrainingRequestMaxAttemptsPresenter,
    TrainingRequestNotificationPresenter,
    TrainingRequestPanel,
    TrainingRequestTraineesEditor,
    TrainingStateFilterPresenter,
    TrainingStatePresenter,
    ViewAllTrainings,
    ViewIncomingRequests,
    ViewMyTrainings,
    ViewMyResults,
    ViewSentRequests,
    ViewTraineesResults,
    Settings
  },
  action: {
    TrainingChangeOwnerAction: trainingChangeOwnerAction.action,
    TrainingChangeOwnerIsAvailable: trainingChangeOwnerAction.isAvailable,

    TrainingDeleteAction: trainingDeleteAction.action,
    TrainingDeleteIsAvailable: trainingDeleteAction.isAvailable,

    TrainingDraftAction: trainingDraftAction.action,
    TrainingDraftIsAvailable: trainingDraftAction.isAvailable,

    TrainingDuplicateAction: trainingDuplicateAction.action,
    TrainingDuplicateIsAvailable: trainingDuplicateAction.isAvailable,

    TrainingReleaseAction: trainingReleaseAction.action,
    TrainingReleaseIsAvailable: trainingReleaseAction.isAvailable,

    TrainingRequestCancelAction: trainingRequestCancelAction.action,
    TrainingRequestCancelIsAvailable: trainingRequestCancelAction.isAvailable,

    TrainingRequestChangeOwnerAction: trainingRequestChangeOwnerAction.action,
    TrainingRequestChangeOwnerIsAvailable: trainingRequestChangeOwnerAction.isAvailable,

    TrainingRequestCreateAction: trainingRequestCreateAction.action,
    TrainingRequestCreateIsAvailable: trainingRequestCreateAction.isAvailable
  },
  function: {
    TrainingAttemptLinkProviderEncode: trainingAttemptLinkProviderEncode,
    TrainingAttemptStateSort: trainingAttemptStateSort,
    TrainingAttemptStateAllValues: trainingAttemptStateAllValues,
    TrainingLinkProviderEncode: trainingLinkProviderEncode,
    TrainingRequestLinkProviderEncode: trainingRequestLinkProviderEncode,
    TrainingRequestObjectTitleProvider: trainingRequestObjectTitleProvider,
    TrainingStateSort: trainingStateSort,
    TrainingStateAllValues: trainingStateAllValues
  },
  resolver: {
    Location: resolveLocation
  }
})
