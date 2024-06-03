//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum } from '@hcengineering/core'
import { trainingId, TrainingSpecialIds } from '@hcengineering/training'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import type { Route, RouteParams } from '../utils/Route'

export enum AllTrainingsRouteTab {
  Released = 'released',
  Drafts = 'drafts',
  Archived = 'archived',
  All = 'all'
}

export interface AllTrainingsRouteParams extends RouteParams {
  tab: AllTrainingsRouteTab | null
}

export const allTrainingsRoute: Route<AllTrainingsRouteParams> = {
  build (params: AllTrainingsRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingSpecialIds.AllTrainings,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingSpecialIds.AllTrainings
      ? { tab: isEnum(AllTrainingsRouteTab)(location.path[4]) ? location.path[4] : null }
      : null,

  resolve: async () => null
}
