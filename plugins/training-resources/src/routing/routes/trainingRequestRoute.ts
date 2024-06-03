//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { isEnum, isId } from '@hcengineering/core'
import { trainingId, type TrainingRequest } from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import training from '../../plugin'
import { getCurrentEmployeeRef } from '../../utils'
import { getPanelFragment } from '../utils/getPanelFragment'
import type { Route, RouteParams } from '../utils/Route'
import { TrainingRoutingParts } from '../utils/TriainingRoutingParts'
import { incomingRequestRoute } from './incomingRequestsRoute'
import { sentRequestRoute, SentRequestsRouteTab } from './sentRequestsRoute'

export enum TrainingRequestRouteTab {
  Overview = 'overview',
  Questions = 'questions',
  TraineesResults = 'trainees-results',
  MyResults = 'my-results'
}

export interface TrainingRequestRouteParams extends RouteParams {
  id: TrainingRequest['_id']
  tab: TrainingRequestRouteTab | null
}

export const trainingRequestRoute: Route<TrainingRequestRouteParams> = {
  build (params: TrainingRequestRouteParams): Location {
    const location = getCurrentLocation()
    return {
      ...location,
      fragment: undefined,
      query: undefined,
      path: [
        location.path[0],
        location.path[1],
        trainingId,
        TrainingRoutingParts.Requests,
        params.id,
        ...(params.tab === null ? [] : [params.tab])
      ]
    }
  },

  match: (location: Location) =>
    location.path[2] === trainingId && location.path[3] === TrainingRoutingParts.Requests && isId(location.path[4])
      ? {
          id: location.path[4],
          tab: isEnum(TrainingRequestRouteTab)(location.path[5]) ? location.path[5] : null
        }
      : null,

  async resolve (location: Location, params: TrainingRequestRouteParams): Promise<ResolvedLocation | null> {
    const object = await getClient().findOne(training.class.TrainingRequest, { _id: params.id })
    if (object === undefined) {
      return null
    }

    const isOwner = object.owner === getCurrentEmployeeRef()

    return {
      loc: {
        ...(isOwner
          ? sentRequestRoute.build({
            tab: object.canceledOn === null ? SentRequestsRouteTab.Active : SentRequestsRouteTab.Canceled
          })
          : incomingRequestRoute.build({})),
        fragment: getPanelFragment(object)
      },
      defaultLocation: {
        ...location
      }
    }
  }
}
