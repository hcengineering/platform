import type { Action } from '@anticrm/view'
import view from '@anticrm/view'
import { Client, DocumentQuery } from '@anticrm/core'

export const getCardActions = async (client: Client, query?: DocumentQuery<Action>): Promise<Action[]> => {
  return await client.findAll(view.class.Action, query ?? {})
}
