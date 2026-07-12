import { describe, expect, test } from 'bun:test'
import { getProjectId, transformProjectV3ToV4 } from '../transformers/v3-to-v4'
import { projectWithNoId, v3Project, v4Project } from './fixtures'

describe('V3 to V4 Migration', () => {
  describe('transformProjectV3ToV4', () => {
    test('adds type video to metadata', () => {
      const result = transformProjectV3ToV4({ project: v3Project })

      expect(result.skipped).toBe(false)
      expect(result.project.version).toBe(4)

      const metadata = result.project.metadata as Record<string, unknown>
      expect(metadata.type).toBe('video')
    })

    test('preserves existing metadata fields', () => {
      const result = transformProjectV3ToV4({ project: v3Project })

      const metadata = result.project.metadata as Record<string, unknown>
      expect(metadata.id).toBe(v3Project.metadata.id)
      expect(metadata.name).toBe(v3Project.metadata.name)
      expect(metadata.thumbnail).toBe(v3Project.metadata.thumbnail)
      expect(metadata.duration).toBe(v3Project.metadata.duration)
      expect(metadata.createdAt).toBe(v3Project.metadata.createdAt)
      expect(metadata.updatedAt).toBe(v3Project.metadata.updatedAt)
    })

    test('preserves settings object', () => {
      const result = transformProjectV3ToV4({ project: v3Project })

      expect(result.project.settings).toEqual(v3Project.settings)
    })

    test('preserves scenes array', () => {
      const result = transformProjectV3ToV4({ project: v3Project })

      expect(result.project.scenes).toEqual(v3Project.scenes)
    })

    test('skips project that already has v4 structure', () => {
      const result = transformProjectV3ToV4({ project: v4Project })

      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('already v4')
    })

    test('skips project that has type in metadata', () => {
      const projectWithType = {
        ...v3Project,
        version: 3,
        metadata: {
          ...v3Project.metadata,
          type: 'audio',
        },
      }
      const result = transformProjectV3ToV4({ project: projectWithType })

      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('already v4')
    })

    test('skips project with no id', () => {
      const result = transformProjectV3ToV4({ project: projectWithNoId })

      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('no project id')
    })

    test('handles project without metadata object', () => {
      const projectWithoutMetadata = {
        id: 'no-metadata',
        version: 3,
        scenes: [],
      }
      const result = transformProjectV3ToV4({
        project: projectWithoutMetadata,
      })

      expect(result.skipped).toBe(false)
      const metadata = result.project.metadata as Record<string, unknown>
      expect(metadata.type).toBe('video')
    })
  })

  describe('getProjectId', () => {
    test('returns id from root level', () => {
      const projectWithRootId = { id: 'root-id', metadata: {} }
      const id = getProjectId({ project: projectWithRootId })
      expect(id).toBe('root-id')
    })
  })
})
