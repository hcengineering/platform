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
import training from './plugin'

export const roles = [
  {
    _id: training.role.QARA,
    name: 'QARA',
    permissions: [
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
  {
    _id: training.role.Manager,
    name: 'Managers',
    permissions: [
      training.permission.CreateTraining,
      training.permission.ViewSomeoneElsesTrainingOverview,
      training.permission.ViewSomeoneElsesTrainingQuestions,
      training.permission.CreateRequestOnSomeoneElsesTraining,
      training.permission.ViewSomeoneElsesSentRequest,
      training.permission.ViewSomeoneElsesTraineesResults
    ]
  },
  {
    _id: training.role.QualifiedUser,
    name: 'Qualified Users',
    permissions: [training.permission.CreateTraining]
  }
]
