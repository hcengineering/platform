//
// Copyright © 2020 Anticrm Platform Contributors.
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

import CreateVacancy from './components/CreateVacancy.svelte'
import CreateCandidates from './components/CreateCandidates.svelte'
import CreateCandidate from './components/CreateCandidate.svelte'
import CreateApplication from './components/CreateApplication.svelte'
import EditCandidate from './components/EditCandidate.svelte'

export default async () => ({
  component: {
    CreateVacancy,
    CreateCandidates,
    CreateCandidate,
    CreateApplication,
    EditCandidate
  },
})
