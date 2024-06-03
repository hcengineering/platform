//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum } from '@hcengineering/core'
import { trainingId, TrainingSpecialIds } from '@hcengineering/training'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import type { Route, RouteParams } from '../utils/Route'

export enum SentRequestsRouteTab {
  Active = 'active',
  Canceled = 'canceled',
  All = 'all'
}

export interface SentRequestsRouteParams extends RouteParams {
  tab: SentRequestsRouteTab | null
}

export const sentRequestRoute: Route<SentRequestsRouteParams> = {
  build (params: SentRequestsRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingSpecialIds.SentRequests,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingSpecialIds.SentRequests
      ? { tab: isEnum(SentRequestsRouteTab)(location.path[4]) ? location.path[4] : null }
      : null,

  resolve: async () => null
}
