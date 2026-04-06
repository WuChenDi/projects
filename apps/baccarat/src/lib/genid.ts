import { GenidOptimized } from '@cdlab996/genid'

let _genid: GenidOptimized | null = null

export function getGenid(): GenidOptimized {
  if (!_genid) {
    _genid = new GenidOptimized({ workerId: 1 })
  }
  return _genid
}
