//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum } from '@hcengineering/core'
import { trainingId, TrainingSpecialIds } from '@hcengineering/training'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import type { Route, RouteParams } from '../utils/Route'

export enum TraineesResultsRouteTab {
  Draft = 'draft',
  Passed = 'passed',
  Failed = 'failed',
  All = 'all'
}

export interface TraineesResultsRouteParams extends RouteParams {
  tab: TraineesResultsRouteTab | null
}

export const traineesResultsRoute: Route<TraineesResultsRouteParams> = {
  build (params: TraineesResultsRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingSpecialIds.TraineesResults,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingSpecialIds.TraineesResults
      ? { tab: isEnum(TraineesResultsRouteTab)(location.path[4]) ? location.path[4] : null }
      : null,

  resolve: async () => null
}
