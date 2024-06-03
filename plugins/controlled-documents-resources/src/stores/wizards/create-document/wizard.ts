//
// Copyright © 2022-2024 Hardcore Engineering Inc.
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
import { createStore } from 'effector'
import { type Ref } from '@hcengineering/core'
import { type DocumentSpace, type Project, type ProjectDocument } from '@hcengineering/controlled-documents'

import {
  currentStepUpdated,
  infoStepUpdated,
  locationStepUpdated,
  teamStepUpdated,
  templateStepUpdated,
  wizardClosed,
  wizardOpened
} from './actions'

export interface DocumentWizardState {
  location: {
    space: Ref<DocumentSpace> | undefined
    project: Ref<Project> | undefined
    parent?: Ref<ProjectDocument> | undefined
  }
  template: {
    collapsedCategories: Record<string, any>
  }
  info: {
    selectedReason: 'newDoc' | 'custom'
    customReason: string
  }
  team: object
}

const documentWizardInitialState: DocumentWizardState = {
  location: {
    space: undefined,
    project: undefined,
    parent: undefined
  },
  template: {
    collapsedCategories: {}
  },
  info: {
    selectedReason: 'newDoc' as const,
    customReason: ''
  },
  team: {}
}

export type DocumentWizardStep = keyof DocumentWizardState
export type TemplateWizardStep = Exclude<DocumentWizardStep, 'template'>
export type DocumentWizardStepState<T extends DocumentWizardStep> = DocumentWizardState[T]

export const $documentWizard = createStore<DocumentWizardState>(documentWizardInitialState)
  .on(wizardOpened, (_, payload) => ({ ...documentWizardInitialState, ...payload }))
  .on(locationStepUpdated, (state, payload) => {
    return { ...state, location: { ...state.location, ...payload } }
  })
  .on(templateStepUpdated, (state, payload) => {
    return { ...state, template: { ...state.template, ...payload } }
  })
  .on(infoStepUpdated, (state, payload) => {
    return { ...state, info: { ...state.info, ...payload } }
  })
  .on(teamStepUpdated, (state, payload) => {
    return { ...state, team: { ...state.team, ...payload } }
  })
  .reset(wizardClosed)

export const $locationStep = $documentWizard.map((wizard) => wizard.location)
export const $templateStep = $documentWizard.map((wizard) => wizard.template)
export const $infoStep = $documentWizard.map((wizard) => wizard.info)
export const $teamStep = $documentWizard.map((wizard) => wizard.team)

export const $currentStep = createStore<DocumentWizardStep | TemplateWizardStep>('location')
  .on(wizardOpened, (currentStep, payload) => payload.$$currentStep ?? currentStep)
  .on(currentStepUpdated, (_, payload) => payload)
  .reset(wizardClosed)
