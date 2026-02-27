/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

const logWithTimestamp = (message?: any, ...optionalParams: any[]) => {
  const timestamp = new Date().toLocaleString()
  console.log(`[${timestamp}]`, message, ...optionalParams)
}

const infoWithTimestamp = (message?: any, ...optionalParams: any[]) => {
  const timestamp = new Date().toLocaleString()
  console.info(`[${timestamp}]`, message, ...optionalParams)
}

const warnWithTimestamp = (message?: any, ...optionalParams: any[]) => {
  const timestamp = new Date().toLocaleString()
  console.warn(`[${timestamp}]`, message, ...optionalParams)
}

const errorWithTimestamp = (message?: any, ...optionalParams: any[]) => {
  const timestamp = new Date().toLocaleString()
  console.error(`[${timestamp}]`, message, ...optionalParams)
}

const debugWithTimestamp = (message?: any, ...optionalParams: any[]) => {
  const timestamp = new Date().toLocaleString()
  console.debug(`[${timestamp}]`, message, ...optionalParams)
}

export const logger = {
  log: logWithTimestamp,
  info: infoWithTimestamp,
  warn: warnWithTimestamp,
  error: errorWithTimestamp,
  debug: debugWithTimestamp,
}
