import { createIDBStore } from '@cdlab/utils'

const dbStore = createIDBStore<string>('dropply-retrieve-data', 'text-contents')

// Blob store for the local-crypto process history (encrypt/decrypt results)
const cryptoDbStore = createIDBStore('dropply-process-data')

export { cryptoDbStore, dbStore }
