# Agent Design Analysis

## 决策对齐
- **自适应停止 + cap=999**：运行时仅使用硬上限避免 runaway，不再按 skill 固定步数截断。
- **显式失败 + 结构化返回**：工具执行异常通过 `AssistantToolResult` 返回，避免直接 throw 中断流程。
- **confirmed gate**：强制 `confirmation.confirmed=true`，预留 `confirmation.budget.id` 以支持未来预算授权。

## 风险与缓解
- **缺失 AGENTS.md/既定设计文档**：已在交接报告与进度中记录，后续需补齐来源。
- **Project Agent 未实现**：当前仅有 assistant-platform；需要补齐 operation registry 与线程持久化。
