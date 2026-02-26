import { getCloudflareContext } from '@opennextjs/cloudflare'
import { AVAILABLE_MODELS } from '@/lib/data'

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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!PASSWORDS.includes(data.password)) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if ('prompt' in data && 'model' in data) {
    const selectedModel = AVAILABLE_MODELS.find((m) => m.id === data.model)
    if (!selectedModel) {
      return new Response(JSON.stringify({ error: 'Model is invalid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const model = selectedModel.key as keyof AiModels
    let inputs: { prompt: string; [key: string]: any } = { prompt: '' }

    // Input parameter processing
    if (data.model === 'flux-1-schnell') {
      let steps = data.num_steps || 6
      if (steps >= 8) steps = 8
      else if (steps <= 4) steps = 4

      // Only prompt and steps
      inputs = {
        prompt: data.prompt || 'cyberpunk cat',
        steps: steps,
      }
    } else {
      // Default input parameters
      inputs = {
        prompt: data.prompt || 'cyberpunk cat',
        negative_prompt: data.negative_prompt || '',
        height: data.height || 1024,
        width: data.width || 1024,
        num_steps: data.num_steps || 20,
        strength: data.strength || 0.1,
        guidance: data.guidance || 7.5,
        seed:
          data.seed || parseInt((Math.random() * 1024 * 1024).toString(), 10),
      }
    }

    console.log(
      `Generating image with ${model} and prompt: ${inputs.prompt.substring(0, 50)}...`,
    )

    try {
      const response = await env.AI.run(model, inputs)

      // Processing the response of the flux-1-schnell model
      if (data.model === 'flux-1-schnell') {
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
                headers: { 'Content-Type': 'application/json' },
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
              headers: { 'Content-Type': 'application/json' },
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
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      } else {
        // @ts-expect-error
        return new Response(response, {
          headers: {
            'content-type': 'image/png',
          },
        })
      }
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
