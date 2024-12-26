import { Packr } from 'msgpackr'
import type {Response, Request} from '@hcengineering/communication-sdk-types'

import type {RawData} from "ws";

const packr = new Packr({ structuredClone: true, bundleStrings: true, copyBuffers: false })

export function serializeResponse(resp: Response, binary: boolean) {
    return binary ? serializeBinary(resp) : serializeJson(resp)
}

export function deserializeRequest(raw: RawData, binary: boolean): Request | undefined {
    let buff: Buffer | undefined
    if (raw instanceof Buffer) {
        buff = raw
    } else if (Array.isArray(raw)) {
        buff = Buffer.concat(raw.map(it => new Uint8Array(it)))
    }

    if(buff === undefined) {
        return undefined
    }

    return binary ? deserializeBinary(buff) : deserializeJson(buff)
}

function deserializeBinary(data: any): any {
    return packr.decode(data)
}

function deserializeJson(data: any): any {
    return JSON.parse(data.toString())
}

function serializeBinary(data: any) {
    return new Uint8Array(packr.encode(data))
}

function  serializeJson(data: any) {
    return JSON.stringify(data)
}