//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Location, ResolvedLocation } from '@hcengineering/ui'

/** @public */
export type RouteParams = Record<string, any>

/** @public */
export interface Route<Params extends RouteParams = RouteParams> {
  match: (location: Location) => Params | null
  build: (params: Params) => Location
  resolve: (location: Location, params: Params) => Promise<ResolvedLocation | null>
}
