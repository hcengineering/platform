//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { AnyAttribute, Client } from '@hcengineering/core'

/**
 * Check whether any document has a value for the attribute.
 *
 * Mixins declared on a domainless class (e.g. a mixin on core.class.Doc) can be
 * applied to documents of any domain, so they cannot be queried directly. The
 * attribute is treated as used in that case, which keeps its type locked and
 * shows the stronger delete confirmation.
 */
export async function isAttributeUsed (
  client: Pick<Client, 'findOne' | 'getHierarchy'>,
  attribute: Pick<AnyAttribute, 'attributeOf' | 'name'>
): Promise<boolean> {
  if (client.getHierarchy().findDomain(attribute.attributeOf) === undefined) {
    return true
  }
  return (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined
}
