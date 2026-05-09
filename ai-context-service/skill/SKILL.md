# ai-context

查询 AI CODING 上下文管理平台的项目信息、接口链路和影响分析。

## 配置

在下方填写你的 API Token（在 Web 端「个人设置」中生成）：

```
AI_CONTEXT_TOKEN=ac_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

API 地址自动从环境变量 `AI_CONTEXT_BASE_URL` 读取，默认 `http://localhost:8000/api/v1`。

## 可用操作

通过 curl 调用 REST API：

### 系统与APP
- **查看系统列表**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/systems
- **查看系统详情(含APP列表)**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/systems/{id}
- **查看APP详情**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}

### 索引
- **触发索引**: curl -X POST -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/index -H 'Content-Type: application/json' -d '{"include_wiki":true}'
- **查看索引状态**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/index/status

### 查询
- **获取接口路由**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/routes
- **影响分析**: curl -X POST -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/impact -H 'Content-Type: application/json' -d '{"target":"POST /api/v1/payment","direction":"both","depth":3}'
- **代码搜索**: curl -X POST -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/search -H 'Content-Type: application/json' -d '{"query":"支付处理","mode":"hybrid","limit":20}'
- **获取Wiki目录**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/wiki
- **获取Wiki模块内容**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/wiki/{module}
- **跨仓库读源码**: curl -X POST -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/code/read -H 'Content-Type: application/json' -d '{"items":[{"app_id":"app-payment","ref":"main","path":"src/service/PaymentService.java","start_line":1,"end_line":200}],"max_bytes_per_file":65536}'

### 文档
- **系统文档列表**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/systems/{id}/documents
- **APP文档列表**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" $AI_CONTEXT_BASE_URL/apps/{id}/documents
- **下载文档**: curl -H "Authorization: Bearer $AI_CONTEXT_TOKEN" -O $AI_CONTEXT_BASE_URL/documents/{doc_id}/download

## 行为规则

1. 首次使用时，从本文件「配置」章节的代码块中读取 `AI_CONTEXT_TOKEN` 的值作为 API Token
2. `AI_CONTEXT_BASE_URL` 从环境变量读取，未设置时默认 `http://localhost:8000/api/v1`
3. 所有 API 请求携带 `Authorization: Bearer $AI_CONTEXT_TOKEN`
4. 如果 Token 值为空或以 `ac_xxx...` 占位符形式存在，提示用户：「请先编辑此文件，将 `AI_CONTEXT_TOKEN=` 后面替换为你的真实 API Token（在 Web 端个人设置中生成）」
5. 先了解用户要查询的系统/APP，必要时先列出系统列表
6. 查询结果以结构化方式呈现给用户
7. 影响分析结果应包含风险等级、受影响范围和测试建议
8. Wiki 内容包含 Mermaid 架构图，直接渲染给用户
9. 如果 APP 未索引（index_status=none），提示用户先触发索引
10. 跨仓库读源码支持批量读取多个 APP 的文件，可通过 start_line/end_line 指定行号范围
11. 读源码时先通过查看系统列表或APP详情获取 app_id，再按路径读取，结果中包含 resolved_commit 用于溯源
