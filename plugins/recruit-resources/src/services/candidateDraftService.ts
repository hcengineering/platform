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

import { generateId } from '@hcengineering/core'
import { Candidate, CandidateDraft } from '@hcengineering/recruit'
import { DraftController, MultipleDraftController } from '@hcengineering/presentation'
import recruit from '../plugin'

export class CandidateDraftService {
  private mDraftController: MultipleDraftController
  private draftController: DraftController<CandidateDraft>
  private id: Ref<Candidate>

  constructor(shouldSaveDraft: boolean = true) {
    this.mDraftController = new MultipleDraftController(recruit.mixin.Candidate)
    this.id = generateId()
    this.draftController = new DraftController<CandidateDraft>(
      shouldSaveDraft ? this.mDraftController.getNext() ?? this.id : undefined,
      recruit.mixin.Candidate
    )
  }

  getEmptyCandidate(id: Ref<Candidate> | undefined = undefined): CandidateDraft {
    return {
      _id: id ?? generateId(),
      firstName: '',
      lastName: '',
      title: '',
      channels: [],
      skills: [],
      city: ''
    }
  }

  getDraft(): CandidateDraft | undefined {
    return this.draftController.get()
  }

  saveDraft(draft: CandidateDraft, empty: any): void {
    this.draftController.save(draft, empty)
  }

  removeDraft(): void {
    this.draftController.remove()
  }

  subscribe(callback: (draft: CandidateDraft | undefined) => void): () => void {
    return this.draftController.subscribe(callback)
  }
} 