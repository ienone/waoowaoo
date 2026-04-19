# Testing Guidelines (Agent)

## 测试分层
- **Unit**：覆盖 `assistant-platform` 的 runtime、tool 逻辑与输入校验。
- **Integration (API)**：覆盖 `/api/user/assistant/chat` 路由鉴权、body 解析、错误映射。

## 断言规范
- 必须断言具体值（返回字段、错误 code/message、DB 写入内容）。
- 不得仅使用 `toHaveBeenCalled` 作为唯一断言。

## Mock 规范
- 仅 mock 外部边界（LLM/provider、prisma、storage、HTTP）。
- mock 返回值必须被业务逻辑处理并断言其行为。

## 现有测试入口
- `tests/unit/assistant-platform/*`
- `tests/integration/api/specific/user-assistant-chat-api-config.test.ts`
