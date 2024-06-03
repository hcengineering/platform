//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import { createEvent } from 'effector'

import { type DocumentWizardStep, type DocumentWizardState, type DocumentWizardStepState } from './wizard'

const generateActionName = (action: string): string => `documents/wizard/actions/${action}`

export const wizardOpened = createEvent<Partial<DocumentWizardState> & { $$currentStep?: DocumentWizardStep }>(
  generateActionName('wizardOpened')
)
export const wizardClosed = createEvent(generateActionName('wizardClosed'))

type StepAction<S extends DocumentWizardStep> = Partial<DocumentWizardStepState<S>>

export const locationStepUpdated = createEvent<StepAction<'location'>>(generateActionName('locationStepUpdated'))
export const templateStepUpdated = createEvent<StepAction<'template'>>(generateActionName('templateStepUpdated'))
export const infoStepUpdated = createEvent<StepAction<'info'>>(generateActionName('infoStepUpdated'))
export const teamStepUpdated = createEvent<StepAction<'team'>>(generateActionName('teamStepUpdated'))

export const currentStepUpdated = createEvent<DocumentWizardStep>(generateActionName('currentStepUpdated'))
