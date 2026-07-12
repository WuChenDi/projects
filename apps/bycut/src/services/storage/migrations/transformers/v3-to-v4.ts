import type { MigrationResult, ProjectRecord } from './types'
import { getProjectId, isRecord } from './utils'

export function transformProjectV3ToV4({
  project,
}: {
  project: ProjectRecord
}): MigrationResult<ProjectRecord> {
  const projectId = getProjectId({ project })
  if (!projectId) {
    return { project, skipped: true, reason: 'no project id' }
  }

  if (isV4Project({ project })) {
    return { project, skipped: true, reason: 'already v4' }
  }

  const metadataValue = project.metadata
  const metadata = isRecord(metadataValue)
    ? { ...metadataValue, type: 'video' }
    : { type: 'video' }

  const migratedProject = {
    ...project,
    metadata,
    version: 4,
  }

  return { project: migratedProject, skipped: false }
}

export { getProjectId } from './utils'

function isV4Project({ project }: { project: ProjectRecord }): boolean {
  const versionValue = project.version
  if (typeof versionValue === 'number' && versionValue >= 4) {
    return true
  }

  return isRecord(project.metadata) && typeof project.metadata.type === 'string'
}
