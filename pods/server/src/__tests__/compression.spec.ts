import { readFile } from 'fs/promises'
import { compress } from 'snappy'
import { RPCHandler } from '@hcengineering/rpc'

describe('compression-tests', () => {
  it('check-snappy', async () => {
    const modelJSON = (await readFile('./bundle/model.json')).toString()

    const txes = JSON.parse(modelJSON)

    const compressed = await compress(modelJSON)
    console.log(modelJSON.length, compressed.length, compressed.length / modelJSON.length)
    expect(compressed.length).toBeLessThan(modelJSON.length)

    const rpc = new RPCHandler()

    const jsonData = rpc.serialize(txes, true)

    const compressed2 = await compress(jsonData)
    console.log(jsonData.length, compressed2.length, compressed2.length / jsonData.length)
    expect(compressed2.length).toBeLessThan(jsonData.length)
  })
})
