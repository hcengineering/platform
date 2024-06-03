//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum } from '@hcengineering/core'
import { trainingId, TrainingSpecialIds } from '@hcengineering/training'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import type { Route, RouteParams } from '../utils/Route'

export enum MyTrainingsRouteTab {
  Released = 'released',
  Drafts = 'drafts',
  Archived = 'archived',
  All = 'all'
}

export interface MyTrainingsRouteParams extends RouteParams {
  tab: MyTrainingsRouteTab | null
}

export const myTrainingsRoute: Route<MyTrainingsRouteParams> = {
  build (params: MyTrainingsRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingSpecialIds.MyTrainings,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingSpecialIds.MyTrainings
      ? { tab: isEnum(MyTrainingsRouteTab)(location.path[4]) ? location.path[4] : null }
      : null,

  resolve: async () => null
}
