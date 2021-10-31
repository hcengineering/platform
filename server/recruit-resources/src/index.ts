//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Doc, Tx, TxFactory } from '@anticrm/core'
import type { FindAll } from '@anticrm/server-core'
// import type { Applicant } from '@anticrm/recruit'

// import recruit from '@anticrm/recruit'
// import core from '@anticrm/core'

/**
 * @public
 */
export async function OnApplication (tx: Tx, txFactory: TxFactory, findAll: FindAll<Doc>): Promise<Tx[]> {
  // if (tx._class === core.class.TxCreateDoc) {
  //   const createTx = tx as TxCreateDoc<Applicant>
  //   if (createTx.objectClass === recruit.class.Applicant) {
  //     const _id = createTx.attributes.candidate
  //     const candidate = (await findAll(recruit.class.Candidate, { _id }))[0] // TODO: HATE THIS
  //     return [txFactory.createTxUpdateDoc(recruit.class.Candidate, candidate.space, _id, { $inc: { applications: 1 } })]
  //   }
  // }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnApplication
  }
})
