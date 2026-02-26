export interface Model {
  id: string
  name: string
  description: string
  key: string
  disabled: boolean
  group: string
}

export interface ModelGroup {
  id: string
  name: string
  image?: string
  models: Model[]
}

export enum GenerationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface GenerationResult {
  id: string
  status: GenerationStatus
  params: GenerateParams
  imageUrl?: string
  error?: string
  generationTime?: number
}

export interface GenerateParams {
  prompt: string
  model: string
  password?: string
  negative_prompt?: string
  width?: number
  height?: number
  num_steps?: number
  guidance?: number
  seed?: number
}
