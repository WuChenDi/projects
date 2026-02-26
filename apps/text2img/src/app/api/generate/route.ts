import { getCloudflareContext } from '@opennextjs/cloudflare'
import { AVAILABLE_MODELS, findModelById } from '@/lib'

interface GenerateRequest {
  prompt?: string
  model?: string
  password?: string
  negative_prompt?: string
  width?: number
  height?: number
  num_steps?: number
  strength?: number
  guidance?: number
  seed?: number
}

interface ModelConfig {
  prepareInputs: (data: GenerateRequest) => any
  processResponse: (response: any) => Response
}

const defaultModelConfig: ModelConfig = {
  prepareInputs: (data: GenerateRequest) => ({
    prompt: data.prompt || 'cyberpunk cat',
    negative_prompt: data.negative_prompt || '',
    height: data.height || 1024,
    width: data.width || 1024,
    num_steps: data.num_steps || 20,
    strength: data.strength || 0.1,
    guidance: data.guidance || 7.5,
    seed: data.seed || Math.floor(Math.random() * 1024 * 1024),
  }),
  processResponse: (response: any) => {
    return new Response(response, {
      headers: {
        'content-type': 'image/png',
      },
    })
  },
}

const blackForestLabsConfig: ModelConfig = {
  prepareInputs: (data: GenerateRequest) => {
    if (data.model === 'flux-1-schnell') {
      let steps = data.num_steps || 6
      if (steps >= 8) steps = 8
      else if (steps <= 4) steps = 4

      return {
        prompt: data.prompt || 'cyberpunk cat',
        steps: steps,
      }
    }

    const formData = new FormData()
    formData.append('prompt', data.prompt || 'cyberpunk cat')

    if (data.negative_prompt) {
      formData.append('negative_prompt', data.negative_prompt)
    }
    if (data.width) {
      formData.append('width', data.width.toString())
    }
    if (data.height) {
      formData.append('height', data.height.toString())
    }
    if (data.num_steps) {
      formData.append('num_steps', data.num_steps.toString())
    }
    if (data.guidance) {
      formData.append('guidance', data.guidance.toString())
    }

    const seed =
      data.seed !== undefined
        ? data.seed
        : Math.floor(Math.random() * 1024 * 1024)
    formData.append('seed', seed.toString())

    const req = new Request('http://placeholder', {
      method: 'POST',
      body: formData,
    })

    return {
      multipart: {
        body: req.body,
        contentType: req.headers.get('content-type') || 'multipart/form-data',
      },
    }
  },
  processResponse: (response: any) => {
    let jsonResponse

    if (typeof response === 'object') {
      jsonResponse = response
    } else {
      try {
        jsonResponse = JSON.parse(response)
      } catch (e: any) {
        console.error('Failed to parse JSON response:', e)
        return new Response(
          JSON.stringify({
            error: 'Failed to parse response',
            details: e.message,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
    }

    if (!jsonResponse.image) {
      return new Response(
        JSON.stringify({
          error: 'Invalid response format',
          details: 'Image data not found in response',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    try {
      // Convert from base64 to binary data
      const binaryString = atob(jsonResponse.image)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      return new Response(bytes, {
        headers: {
          'content-type': 'image/png',
        },
      })
    } catch (e: any) {
      console.error('Failed to convert base64 to binary:', e)
      return new Response(
        JSON.stringify({
          error: 'Failed to process image data',
          details: e.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }
  },
}

const MODEL_GROUP_CONFIGS: Record<string, ModelConfig> = {
  'black-forest-labs': blackForestLabsConfig,
  leonardo: defaultModelConfig,
  bytedance: defaultModelConfig,
  lykon: defaultModelConfig,
  stabilityai: defaultModelConfig,
  runwayml: defaultModelConfig,
}

export async function POST(request: Request) {
  const data = (await request.json()) as GenerateRequest

  const { env } = getCloudflareContext()

  // Passwords for authentication
  const PASSWORDS = process.env.PASSWORDS
    ? process.env.PASSWORDS.split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  // Check password
  if (PASSWORDS.length > 0) {
    if (!data.password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    if (!PASSWORDS.includes(data.password)) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  }

  if ('prompt' in data && 'model' in data) {
    const selectedModel = findModelById(AVAILABLE_MODELS, data.model!)
    if (!selectedModel) {
      return new Response(JSON.stringify({ error: 'Model is invalid' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if model is disabled
    if (selectedModel.disabled) {
      return new Response(
        JSON.stringify({ error: 'This model is currently disabled' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const model = selectedModel.key as keyof AiModels
    const modelConfig = selectedModel.group
      ? MODEL_GROUP_CONFIGS[selectedModel.group] || defaultModelConfig
      : defaultModelConfig

    console.log(
      `Generating image with ${model} (group: ${selectedModel.group}) and prompt: ${data.prompt?.substring(0, 50)}...`,
    )

    try {
      const inputs = modelConfig.prepareInputs(data)
      const response = await env.AI.run(model, inputs)

      return modelConfig.processResponse(response)
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      return new Response(
        JSON.stringify({
          error: 'Image generation failed',
          details: aiError instanceof Error ? aiError.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  } else {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: prompt or model' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
