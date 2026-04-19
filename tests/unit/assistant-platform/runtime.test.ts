import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserModelConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({ analysisModel: null })),
)
const getProviderConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({ apiKey: 'sk-test', baseUrl: null })),
)
const getProviderKeyMock = vi.hoisted(() => vi.fn(() => 'openai-compatible'))
const resolveLlmRuntimeModelMock = vi.hoisted(() =>
  vi.fn(async () => ({
    provider: 'openai-compatible:oa-1',
    modelId: 'gpt-5-mini',
    modelKey: 'openai-compatible:oa-1::gpt-5-mini',
  })),
)
const createOpenAIMock = vi.hoisted(() =>
  vi.fn(() => ({ chat: vi.fn(() => ({}) as Record<string, unknown>) })),
)
const createGoogleGenerativeAIMock = vi.hoisted(() =>
  vi.fn(() => ({ chat: vi.fn(() => ({}) as Record<string, unknown>) })),
)
const streamTextMock = vi.hoisted(() => vi.fn())
const stepCountIsMock = vi.hoisted(() =>
  vi.fn((max: number) => (context: { stepCount?: number }) => (context.stepCount ?? 0) >= max),
)
const safeValidateUIMessagesMock = vi.hoisted(() =>
  vi.fn(async ({ messages }: { messages: unknown }) => {
    if (!Array.isArray(messages)) {
      return { success: false, error: new Error('invalid') }
    }
    return { success: true, data: messages }
  }),
)
const convertToModelMessagesMock = vi.hoisted(() =>
  vi.fn(async (messages: unknown) => messages),
)

vi.mock('@/lib/config-service', () => ({
  getUserModelConfig: getUserModelConfigMock,
}))
vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
  getProviderKey: getProviderKeyMock,
}))
vi.mock('@/lib/llm/runtime-shared', () => ({
  resolveLlmRuntimeModel: resolveLlmRuntimeModelMock,
}))
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: createOpenAIMock,
}))
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: createGoogleGenerativeAIMock,
}))
vi.mock('ai', () => ({
  convertToModelMessages: convertToModelMessagesMock,
  safeValidateUIMessages: safeValidateUIMessagesMock,
  stepCountIs: stepCountIsMock,
  streamText: streamTextMock,
}))

import { AssistantPlatformError } from '@/lib/assistant-platform'
import { createAssistantChatResponse } from '@/lib/assistant-platform/runtime'

describe('assistant-platform runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: () => new Response('event: done\ndata: ok\n\n', {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
        },
      }),
    })
  })

  it('throws invalid request when messages payload is malformed', async () => {
    await expect(createAssistantChatResponse({
      userId: 'user-1',
      assistantId: 'api-config-template',
      context: {},
      messages: { invalid: true },
    })).rejects.toMatchObject({
      code: 'ASSISTANT_INVALID_REQUEST',
    } as Partial<AssistantPlatformError>)
  })

  it('throws missing model when analysisModel is not configured', async () => {
    getUserModelConfigMock.mockResolvedValueOnce({ analysisModel: null })
    await expect(createAssistantChatResponse({
      userId: 'user-1',
      assistantId: 'api-config-template',
      context: {
        providerId: 'openai-compatible:oa-1',
      },
      messages: [{
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      }],
    })).rejects.toMatchObject({
      code: 'ASSISTANT_MODEL_NOT_CONFIGURED',
    } as Partial<AssistantPlatformError>)
  })

  it('uses cap stopWhen and reports when cap reached', async () => {
    getUserModelConfigMock.mockResolvedValueOnce({ analysisModel: 'openrouter::gpt-5-mini' })
    const response = await createAssistantChatResponse({
      userId: 'user-1',
      assistantId: 'api-config-template',
      context: {
        providerId: 'openai-compatible:oa-1',
      },
      messages: [{
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      }],
    })

    expect(response.status).toBe(200)
    expect(streamTextMock).toHaveBeenCalled()
    const call = streamTextMock.mock.calls[0]
    const stopWhen = call?.[0]?.stopWhen as ((context: { stepCount?: number }) => boolean) | undefined
    expect(stopWhen).toBeTypeOf('function')
    if (!stopWhen) return
    expect(stopWhen({ stepCount: 1 })).toBe(false)
    expect(stopWhen({ stepCount: 998 })).toBe(false)
    expect(() => stopWhen({ stepCount: 999 })).toThrowError(
      expect.objectContaining({ code: 'ASSISTANT_STEP_CAP_REACHED' }),
    )
  })
})
