import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'
import {
  installAuthMocks,
  mockAuthenticated,
  mockUnauthenticated,
  resetAuthMockState,
} from '../../../helpers/auth'

const createAssistantChatResponseMock = vi.hoisted(() =>
  vi.fn(async () => new Response('event: done\ndata: ok\n\n', {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
    },
  })),
)

vi.mock('@/lib/assistant-platform', async () => {
  const actual = await vi.importActual<typeof import('@/lib/assistant-platform')>('@/lib/assistant-platform')
  return {
    ...actual,
    createAssistantChatResponse: createAssistantChatResponseMock,
  }
})

describe('api specific - user assistant chat', () => {
  const routeContext = { params: Promise.resolve({}) }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetAuthMockState()
  })

  it('accepts api-config-template assistant request and forwards payload', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const route = await import('@/app/api/user/assistant/chat/route')

    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: {
        assistantId: 'api-config-template',
        context: {
          providerId: 'openai-compatible:oa-1',
        },
        messages: [{
          id: 'm1',
          role: 'user',
          parts: [{ type: 'text', text: '请配置文生视频模板' }],
        }],
      },
    })

    const res = await route.POST(req, routeContext)
    expect(res.status).toBe(200)
    expect(createAssistantChatResponseMock).toHaveBeenCalledWith({
      userId: 'user-1',
      assistantId: 'api-config-template',
      context: {
        providerId: 'openai-compatible:oa-1',
      },
      messages: [{
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: '请配置文生视频模板' }],
      }],
    })
  })

  it('rejects invalid assistantId', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const route = await import('@/app/api/user/assistant/chat/route')

    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: {
        assistantId: 'unknown-assistant',
        messages: [],
      },
    })

    const res = await route.POST(req, routeContext)
    expect(res.status).toBe(400)
    expect(createAssistantChatResponseMock).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests', async () => {
    installAuthMocks()
    mockUnauthenticated()
    const route = await import('@/app/api/user/assistant/chat/route')

    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: {
        assistantId: 'api-config-template',
        messages: [],
      },
    })

    const res = await route.POST(req, routeContext)
    expect(res.status).toBe(401)
    expect(createAssistantChatResponseMock).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON body', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const route = await import('@/app/api/user/assistant/chat/route')

    const req = new NextRequest('http://localhost:3000/api/user/assistant/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{invalid json',
    })

    const res = await route.POST(req, routeContext)
    expect(res.status).toBe(400)
    const payload = await res.json() as {
      code?: string
      error?: { details?: { code?: string } }
    }
    expect(payload.code).toBe('INVALID_PARAMS')
    expect(payload.error?.details?.code).toBe('BODY_PARSE_FAILED')
    expect(createAssistantChatResponseMock).not.toHaveBeenCalled()
  })

  it('maps assistant platform missing-config error to 400 response', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const { AssistantPlatformError } = await import('@/lib/assistant-platform')
    createAssistantChatResponseMock.mockRejectedValueOnce(
      new AssistantPlatformError('ASSISTANT_MODEL_NOT_CONFIGURED', 'analysisModel is required'),
    )
    const route = await import('@/app/api/user/assistant/chat/route')

    const req = buildMockRequest({
      path: '/api/user/assistant/chat',
      method: 'POST',
      body: {
        assistantId: 'api-config-template',
        context: {
          providerId: 'openai-compatible:oa-1',
        },
        messages: [{
          id: 'm1',
          role: 'user',
          parts: [{ type: 'text', text: 'hello' }],
        }],
      },
    })

    const res = await route.POST(req, routeContext)
    expect(res.status).toBe(400)
    const payload = await res.json() as { code?: string; error?: { code?: string; details?: { code?: string } } }
    expect(payload.error?.code).toBe('MISSING_CONFIG')
    expect(payload.code).toBe('ASSISTANT_MODEL_NOT_CONFIGURED')
    expect(payload.error?.details?.code).toBe('ASSISTANT_MODEL_NOT_CONFIGURED')
  })
})
