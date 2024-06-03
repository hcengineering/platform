//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum, isId } from '@hcengineering/core'
import { type Training, trainingId } from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import training from '../../plugin'
import { getCurrentEmployeeRef } from '../../utils'
import { getPanelFragment } from '../utils/getPanelFragment'
import type { Route, RouteParams } from '../utils/Route'
import { allTrainingsRoute } from './allTrainingsRoute'
import { myTrainingsRoute } from './myTrainingsRoute'
import { TrainingRoutingParts } from '../utils/TriainingRoutingParts'

export enum TrainingRouteTab {
  Overview = 'overview',
  Questions = 'questions',
  SentRequests = 'trainees-requests',
  TraineesResults = 'trainees-results',
  IncomingRequests = 'my-requests',
  MyResults = 'my-results'
}

export interface TrainingRouteParams extends RouteParams {
  id: Training['_id']
  tab: TrainingRouteTab | null
}

export const trainingRoute: Route<TrainingRouteParams> = {
  build (params: TrainingRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      fragment: undefined,
      query: undefined,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingRoutingParts.Trainings,
        params.id,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingRoutingParts.Trainings && isId(location.path[4])
      ? {
          id: location.path[4],
          tab: isEnum(TrainingRouteTab)(location.path[5]) ? location.path[5] : null
        }
      : null,

  async resolve (location: Location, params: TrainingRouteParams): Promise<ResolvedLocation | null> {
    const object = await getClient().findOne(training.class.Training, { _id: params.id })
    if (object === undefined) {
      return null
    }

    const isOwner = object.owner === getCurrentEmployeeRef()

    return {
      loc: {
        ...(isOwner ? myTrainingsRoute.build({ tab: null }) : allTrainingsRoute.build({ tab: null })),
        fragment: getPanelFragment(object)
      },
      defaultLocation: {
        ...location
      }
    }
  }
}
