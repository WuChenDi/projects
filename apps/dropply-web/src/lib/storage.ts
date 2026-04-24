import { createIDBStore } from '@cdlab996/utils'

const dbStore = createIDBStore<string>('dropply-retrieve-data', 'text-contents')

export { dbStore }
