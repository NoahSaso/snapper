import { Query } from '@/types'

import * as astroport from './astroport'
import * as coingecko from './coingecko'
import * as daodao from './daodao'
import * as ibc from './ibc'
import * as osmosis from './osmosis'
import * as rpc from './rpc'
import * as skip from './skip'
import * as stargaze from './stargaze'
import * as whiteWhale from './whiteWhale'

export const queries: Query<any, any>[] = [
  ...Object.values(astroport),
  ...Object.values(coingecko),
  ...Object.values(daodao),
  ...Object.values(ibc),
  ...Object.values(osmosis),
  ...Object.values(rpc),
  ...Object.values(skip),
  ...Object.values(stargaze),
  ...Object.values(whiteWhale),
]
