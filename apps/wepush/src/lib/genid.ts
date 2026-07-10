import { GenidOptimized } from '@cdlab/driftflake'

let instance: GenidOptimized | null = null

function getInstance(): GenidOptimized {
  if (!instance) instance = new GenidOptimized({ workerId: 1 })
  return instance
}

export const genid = {
  nextId: () => getInstance().nextId(),
}
