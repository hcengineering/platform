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

import { handleRequest } from './account'

/**
 * @public
 */
export function handle (req: string | null | undefined, serverEndpoint: string): { statusCode: number, body: string } {
  if (req === null || req === undefined) return { statusCode: 401, body: 'unauthorized' }
  const resp = handleRequest(JSON.parse(req), serverEndpoint)
  if (resp.error !== undefined) {
    return { statusCode: 401, body: '' }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(resp)
  }
}
