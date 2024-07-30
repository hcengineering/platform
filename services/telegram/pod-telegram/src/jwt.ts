import { encode as jwtEncode, decode as jwtDecode } from 'jwt-simple'

import config from './config'

export const encode = (data: any): string => jwtEncode(data, config.Secret)
export const decode = (data: string): any => jwtDecode(data, config.Secret)
