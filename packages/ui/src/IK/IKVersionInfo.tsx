'use client'

import { useEffect } from 'react'

interface IKVersionInfoProps {
  name: string
  version: string
  buildTime?: string
}

export function IKVersionInfo({ name, version, buildTime }: IKVersionInfoProps) {
  useEffect(() => {
    console.groupCollapsed(`%c ${name}: ${version}`, 'color: #07c160;')
    console.log(
      `%c ${name} %c V${version}`,
      'padding: 2px 1px; border-radius: 3px 0 0 3px; color: #fff; background: #5584ff; font-weight: bold;',
      'padding: 2px 1px; border-radius: 0 3px 3px 0; color: #fff; background: #42c02e; font-weight: bold;',
    )
    console.log(
      `%c Build Time %c ${buildTime || 'N/A'}`,
      'padding: 2px 1px; border-radius: 3px 0 0 3px; color: #fff; background: #5584ff; font-weight: bold;',
      'padding: 2px 1px; border-radius: 0 3px 3px 0; color: #fff; background: #42c02e; font-weight: bold;',
    )
    console.groupEnd()
  }, [name, version, buildTime])

  return null
}
