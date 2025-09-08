import { HulypulseClient } from '../client'

jest.setTimeout(120000)

let client: any

beforeAll(async () => {
  client = await HulypulseClient.connect('ws://localhost:8095/ws')
  // client = await HulypulseClient.connect("wss://hulypulse_mem.lleo.me/ws");
  expect(client).toBeInstanceOf(HulypulseClient)
}, 1000)

afterAll(() => {
  client.close()
}, 1000)

test('Put', async () => {
  expect(await client.put('test/online/123', 'MY', 200)).toEqual(true)
}, 500)

test('Get', async () => {
  expect(await client.get('test/online/123')).toEqual('MY')
}, 500)

test('Delete', async () => {
  expect(await client.delete('test/online/123')).toEqual(true)
  expect(await client.delete('test/online/123')).toEqual(false)
  expect(await client.get('test/online/123')).toEqual(false)
}, 500)

test('Subscribe', async () => {
  let r: any
  let cb = function (msg: any, key: string, index: number) {
    r = { ...msg, ...{ key2: key, index } }
  }
  expect(await client.subscribe('test/online/', cb)).toEqual(true)
  expect(await client.subscribe('test/online/', cb)).toEqual(false)
  expect(await client.put('test/online/123', 'Two', 1)).toEqual(true)
  expect(r.message).toEqual('Set')
  expect(r.key).toEqual('test/online/123')
  expect(r.value).toEqual('Two')
  expect(r.key2).toEqual('test/online/')
  expect(r.index).toEqual(0)
}, 1000)

test('Expired', async () => {
  expect(await client.get('test/online/123')).toEqual('Two')
  await new Promise((resolve) => setTimeout(resolve, 1000))
  expect(await client.get('test/online/123')).toEqual(false)
}, 1500)
