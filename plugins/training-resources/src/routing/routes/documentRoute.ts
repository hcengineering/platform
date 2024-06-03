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

import { getCurrentLocation, type Location } from '@hcengineering/ui'
import documents, { documentsId, type Document } from '@hcengineering/controlled-documents'
import { getPanelFragment } from '../utils/getPanelFragment'
import type { Route, RouteParams } from '../utils/Route'

export interface DocumentRouteParams extends RouteParams {
  id: Document['_id']
}

export const documentRoute: Route<DocumentRouteParams> = {
  match: (_location: Location) => null,
  resolve: async (_location: Location, _params: DocumentRouteParams) => await Promise.resolve(null),
  build: (params: DocumentRouteParams) => {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [location.path[0], location.path[1], documentsId],
      fragment: getPanelFragment({
        _class: documents.class.Document,
        _id: params.id
      })
    }
  }
}
