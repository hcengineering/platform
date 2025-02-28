//
// Copyright © 2023 Hardcore Engineering Inc.
//

/// <reference path="../../../common/types/assets.d.ts" />

import { loadMetadata } from '@hcengineering/platform'
import training from '@hcengineering/training'
import icons from '../assets/icons.svg'

loadMetadata(training.icon, {
  Cancel: `${icons}#cancel`,
  Duplicate: `${icons}#duplicate`,
  Release: `${icons}#release`,
  Retry: `${icons}#retry`,
  Training: `${icons}#training`,
  TrainingApplication: `${icons}#training-application`,
  TrainingRequest: `${icons}#request`,
  TrainingAttempt: `${icons}#attempt`,
  ViewAllTrainings: `${icons}#training`,
  ViewIncomingRequests: `${icons}#view-incoming-requests`,
  ViewMyResults: `${icons}#view-my-results`,
  ViewMyTrainings: `${icons}#training-application`,
  ViewSentRequests: `${icons}#view-sent-requests`,
  ViewTraineesResults: `${icons}#attempt`
})
