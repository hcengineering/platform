//
// Copyright © 2026 TraceX SAS.
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

import { Type, type Static } from 'typebox'

export const DocumentReferenceSchema = Type.Object(
  {
    class: Type.String({
      minLength: 1,
      description: 'Stable document class identifier from tool results.'
    }),
    id: Type.String({
      minLength: 1,
      description: 'Stable document identifier from tool results.'
    })
  },
  {
    additionalProperties: false,
    description: 'Reference to an existing platform document by its class and id.'
  }
)

export type DocumentReference = Static<typeof DocumentReferenceSchema>
