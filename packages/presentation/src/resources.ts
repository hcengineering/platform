import { Resources } from '@hcengineering/platform'
import { StatusMiddleware } from './status'

export default async (): Promise<Resources> => ({
  function: {
    CreateStatusMiddleware: StatusMiddleware.create
  }
})
