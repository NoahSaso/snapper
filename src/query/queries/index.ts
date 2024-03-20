import { Query } from '@/types'

import * as coingecko from './coingecko'
import * as daodao from './daodao'
import * as ibc from './ibc'
import * as rpc from './rpc'
import * as skip from './skip'
import * as stargaze from './stargaze'

export const queries: Query<any, any>[] = [
  ...Object.values(coingecko),
  ...Object.values(daodao),
  ...Object.values(ibc),
  ...Object.values(rpc),
  ...Object.values(skip),
  ...Object.values(stargaze),
]
