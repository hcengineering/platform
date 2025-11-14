import * as zmq from 'zeromq'

export const context = new zmq.Context({
  maxSockets: process.env.MAX_SOCKETS != null ? parseInt(process.env.MAX_SOCKETS) : 10000
})
