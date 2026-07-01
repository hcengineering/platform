//
// Node < 22 has no global WebSocket, which Huly's client requires.
// Import this module FIRST (before any @hcengineering import) to polyfill it.
//
import WebSocket from 'ws'

if ((globalThis as any).WebSocket === undefined) {
  ;(globalThis as any).WebSocket = WebSocket
}
