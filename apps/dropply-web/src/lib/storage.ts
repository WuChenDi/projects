import { createIDBStore } from '@cdlab/utils'

const dbStore = createIDBStore<string>('dropply-retrieve-data', 'text-contents')

export { dbStore }
