# Agent Design (Current State)

## Entry Route
- `POST /api/user/assistant/chat`
- 使用 `apiHandler` + `requireUserAuth`，进行 `assistantId` 校验与 body 解析。
- 由 `createAssistantChatResponse` 统一生成响应。

## Runtime
- `src/lib/assistant-platform/runtime.ts`
- 校验 messages payload，解析上下文（providerId/locale）。
- 解析用户模型配置并解析 provider。
- 使用 AI SDK `streamText`，`stopWhen` 为 cap=999 的硬上限；达到上限抛出 `ASSISTANT_STEP_CAP_REACHED`。

## Skills & Tools
- Skills 位于 `src/lib/assistant-platform/skills/*`。
- 当前主要 skill：`api-config-template`（保存模型模板）与 `tutorial`。
- 工具必须返回 `AssistantToolResult`；错误需结构化返回。

## confirmed gate
- 所有具有副作用的工具输入必须包含：
  - `confirmation.confirmed: true`
  - 可选 `confirmation.budget.id`（预留预算授权，不启用隐式兜底）

## 已知缺口
- 未发现独立 Project Agent 运行时与线程持久化实现。
- Tool/Operation registry 尚未引入（需补齐 sideEffects/scope 约束）。
