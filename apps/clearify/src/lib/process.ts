import type { PreTrainedModel, Processor } from '@huggingface/transformers'
import {
  AutoModel,
  AutoProcessor,
  env,
  RawImage,
} from '@huggingface/transformers'

import { logger } from '@/lib'

// Initialize different model configurations
const WEBGPU_MODEL_ID = 'wuchendi/modnet'
const FALLBACK_MODEL_ID = 'briaai/RMBG-1.4'
const RMBG_2_0_MODEL_ID = 'briaai/RMBG-2.0'

interface ModelState {
  model: PreTrainedModel | null
  processor: Processor | null
  isWebGPUSupported: boolean
  currentModelId: string
  isIOS: boolean
}

interface ModelInfo {
  currentModelId: string
  isWebGPUSupported: boolean
  isIOS: boolean
}

// iOS detection
const isIOS = () =>
  ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document)

// State initialization
const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID,
  isIOS: isIOS(),
}

// Configure environment
function configureEnv(useProxy: boolean) {
  env.allowLocalModels = false
  env.cacheDir = '' // Disable cache to avoid initialization issues
  if (env.backends?.onnx?.wasm) {
    logger.debug('Configuring WASM backend:', env.backends.onnx.wasm)
    env.backends.onnx.wasm.proxy = useProxy
    env.backends.onnx.wasm.numThreads = 1 // Optimize for single-threaded performance
    env.backends.onnx.wasm.initTimeout = 10000 // Set 10-second timeout for WASM initialization
    logger.debug('WASM backend configured:', env.backends.onnx.wasm)
  } else {
    logger.warn('WASM backend not available, skipping configuration')
  }
}

// Initialize WebGPU
async function initializeWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    logger.warn('WebGPU not supported by this browser')
    return false
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      logger.warn('No WebGPU adapter found')
      return false
    }

    // Configure environment for WebGPU
    configureEnv(true) // Enable proxy for reliable WASM loading

    // Add delay to ensure WASM backend is ready
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Log WASM configuration for debugging
    logger.debug('WASM configuration:', env.backends?.onnx?.wasm)

    state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
      device: 'webgpu',
    })
    state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID, {})
    state.isWebGPUSupported = true
    state.currentModelId = WEBGPU_MODEL_ID
    logger.log('WebGPU model initialized successfully')
    return true
  } catch (error) {
    logger.error('WebGPU initialization failed:', error)
    return false
  }
}

// Initialize the model based on the selected model ID
export async function initializeModel(forceModelId?: string): Promise<boolean> {
  const selectedModelId = forceModelId || FALLBACK_MODEL_ID

  try {
    // Always use RMBG-1.4 for iOS as a fallback
    if (state.isIOS) {
      logger.log('iOS detected, using RMBG-1.4 model as fallback')
      configureEnv(true)
      state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID)
      state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: 'ImageFeatureExtractor',
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        },
      })
      state.currentModelId = FALLBACK_MODEL_ID
      logger.log('RMBG-1.4 model initialized successfully for iOS')
      return true
    }

    // Try WebGPU
    if (selectedModelId === WEBGPU_MODEL_ID && (await initializeWebGPU())) {
      return true
    }

    // Try RMBG-2.0 (non-WebGPU model)
    if (selectedModelId === RMBG_2_0_MODEL_ID) {
      configureEnv(true)
      state.model = await AutoModel.from_pretrained(RMBG_2_0_MODEL_ID)
      state.processor = await AutoProcessor.from_pretrained(RMBG_2_0_MODEL_ID, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: 'ImageFeatureExtractor',
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        },
      })
      state.currentModelId = RMBG_2_0_MODEL_ID
      logger.log('RMBG-2.0 model initialized successfully')
      return true
    }

    // Fallback to RMBG-1.4
    configureEnv(true)
    state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
      progress_callback: (progress) => {
        // @ts-expect-error
        if (progress.progress) {
          logger.log(
            // @ts-expect-error
            `Model loading progress: ${(progress.progress).toFixed(2)}%`,
          )
        }
      },
    })
    state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
      config: {
        do_normalize: true,
        do_pad: true,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: 'ImageFeatureExtractor',
        image_std: [0.5, 0.5, 0.5],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    })
    state.currentModelId = FALLBACK_MODEL_ID
    return true
  } catch (error) {
    logger.error('Model initialization failed:', error)
    if (
      forceModelId === WEBGPU_MODEL_ID ||
      forceModelId === RMBG_2_0_MODEL_ID
    ) {
      logger.log('Falling back to cross-browser model...')
      return initializeModel(FALLBACK_MODEL_ID)
    }
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to initialize background removal model',
    )
  }
}

// Get current model info
export function getModelInfo(): ModelInfo {
  return {
    currentModelId: state.currentModelId,
    isWebGPUSupported: Boolean(navigator.gpu),
    isIOS: state.isIOS,
  }
}

export async function processImage(image: File): Promise<File> {
  if (!state.model || !state.processor) {
    throw new Error(
      'Model not initialized, please call initializeModel() first',
    )
  }

  try {
    const img = await RawImage.fromURL(URL.createObjectURL(image))
    const { pixel_values } = await state.processor(img)
    const { output } = await state.model({ input: pixel_values })

    // Resize mask back to original size
    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(
        img.width,
        img.height,
      )
    ).data

    // Create new canvas
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Unable to get 2D context')

    // Draw original image output to canvas
    ctx.drawImage(img.toCanvas(), 0, 0)

    // Update alpha channel
    const pixelData = ctx.getImageData(0, 0, img.width, img.height)
    for (let i = 0; i < maskData.length; ++i) {
      pixelData.data[4 * i + 3] = maskData[i]
    }
    ctx.putImageData(pixelData, 0, 0)

    // Convert to Blob
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Failed to create Blob')),
        'image/png',
      ),
    )

    const [fileName] = image.name.split('.')
    return new File([blob], `${fileName}-bg-blasted.png`, { type: 'image/png' })
  } catch (error) {
    logger.error('Image processing failed:', error)
    throw new Error('Image processing failed')
  }
}

export async function processImages(images: File[]): Promise<File[]> {
  logger.log('Starting image processing...')
  const processedFiles: File[] = []

  for (const image of images) {
    try {
      const processedFile = await processImage(image)
      processedFiles.push(processedFile)
      logger.log(`Successfully processed image: ${image.name}`)
    } catch (error) {
      logger.error(`Failed to process image ${image.name}:`, error)
    }
  }

  logger.log('Image processing completed')
  return processedFiles
}
