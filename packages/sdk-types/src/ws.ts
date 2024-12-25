export type RequestId = string

export interface Response {
  id?: RequestId
  result?: any
  error?: string //TODO: Use platform error
}

export interface Request {
  id?: RequestId
  method: string
  params: any[]
}

export interface HelloRequest extends Request {
  binary?: boolean
}
