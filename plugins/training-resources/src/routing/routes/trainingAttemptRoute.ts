//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum, isId } from '@hcengineering/core'
import { type TrainingAttempt, trainingId } from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import training from '../../plugin'
import { getCurrentEmployeeRef } from '../../utils'
import { getPanelFragment } from '../utils/getPanelFragment'
import type { Route, RouteParams } from '../utils/Route'
import { TrainingRoutingParts } from '../utils/TriainingRoutingParts'
import { myResultsRoute } from './myResultsRoute'
import { traineesResultsRoute } from './traineesResultsRoute'

export enum TrainingAttemptRouteTab {
  Overview = 'overview',
  Questions = 'questions'
}

export interface TrainingAttemptRouteParams extends RouteParams {
  id: TrainingAttempt['_id']
  tab: TrainingAttemptRouteTab | null
}

export const trainingAttemptRoute: Route<TrainingAttemptRouteParams> = {
  build (params: TrainingAttemptRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      fragment: undefined,
      query: undefined,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingRoutingParts.Attempts,
        params.id,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingRoutingParts.Attempts && isId(location.path[4])
      ? {
          id: location.path[4],
          tab: isEnum(TrainingAttemptRouteTab)(location.path[5]) ? location.path[5] : null
        }
      : null,

  async resolve (location: Location, params: TrainingAttemptRouteParams): Promise<ResolvedLocation | null> {
    const object = await getClient().findOne(training.class.TrainingAttempt, { _id: params.id })
    if (object === undefined) {
      return null
    }

    const isOwner = object.owner === getCurrentEmployeeRef()

    return {
      loc: {
        ...(isOwner ? myResultsRoute.build({ tab: null }) : traineesResultsRoute.build({ tab: null })),
        fragment: getPanelFragment(object)
      },
      defaultLocation: {
        ...location
      }
    }
  }
}
