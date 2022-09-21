import type { Action } from '@hcengineering/view'
import view from '@hcengineering/view'
import { Client, DocumentQuery } from '@hcengineering/core'

export const getCardActions = async (client: Client, query?: DocumentQuery<Action>): Promise<Action[]> => {
  return await client.findAll(view.class.Action, query ?? {})
}
