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

import type { Tx, TxCreateDoc, TxFactory } from '@anticrm/core'
import type { Applicant } from '@anticrm/recruit'

import recruit from '@anticrm/recruit'
import core from '@anticrm/core'

/**
 * @public
 */
export async function OnApplication (tx: Tx, txFactory: TxFactory): Promise<Tx[]> {
  if (tx._class === core.class.TxCreateDoc) {
    const createTx = tx as TxCreateDoc<Applicant>
    if (createTx.objectClass === recruit.class.Applicant) {
      // const candidate = createTx.attributes.candidate
      // return txFactory.createTxUpdateDoc(recruit.class.Candidate)
      return []
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnApplication
  }
})
