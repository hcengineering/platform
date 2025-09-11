export const backrpcOperations = {
  hello: 0,
  request: 1,
  response: 2,
  responseError: 3,
  event: 4,
  ping: 5,
  pong: 6,
  retry: 7,
  close: 8
}

export type ClientId = string & { __clientId: string }
