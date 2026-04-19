# AI Assistant Domain Architecture Goals

## 目标原则
- **领域边界清晰**：route 只处理鉴权、参数校验、任务提交与响应；复杂业务逻辑下沉到 `src/lib/**`。
- **显式失败**：任何失败都必须明确返回错误结果，不允许静默降级或隐式回退。
- **结构化工具结果**：工具/操作的错误必须以结构化 result 返回，避免 throw 直接中断 observe loop。
- **自适应停止**：运行时以模型自主完成为主，`cap=999` 仅作为硬上限；达到上限必须显式报告停止原因。
- **confirmed gate 保持强制**：所有有副作用的工具调用必须显式确认；预留预算授权元信息但默认不启用。

## 现状与缺口
- 当前 Assistant 平台以 `assistant-platform` 模块为核心，具备基本 tool/skill 结构。
- **Snapshot/Undo**：尚未实现；后续如需支持需在 operation 层面引入持久化快照与回滚策略。
- **Workflow/Project Agent**：当前未见独立“Project Agent”运行时与线程持久化，需后续补齐。
