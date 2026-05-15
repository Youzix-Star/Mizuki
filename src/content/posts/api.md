---
title: 幽云 API调用
published: 2026-05-15
description: ovo
tags: [API, 幽云]
category: API
author: 洛轻羽
draft: false
---

# 统一认证中心 API 接入文档

> 面向第三方开发者的接入指南，涵盖注册、登录、Token 验证、用户名查询的完整调用说明。

---

## 目录

- [基本信息](#基本信息)
- [获取 API Key](#获取-api-key)
- [通用说明](#通用说明)
- [接口列表](#接口列表)
  - [1. 用户注册](#1-用户注册)
  - [2. 用户登录](#2-用户登录)
  - [3. 验证 Token](#3-验证-token)
  - [4. 检查用户名可用性](#4-检查用户名可用性)
- [错误码与排错](#错误码与排错)
- [调用示例](#调用示例)
  - [cURL](#curl)
  - [JavaScript (fetch)](#javascript-fetch)
  - [Python (requests)](#python-requests)
  - [PHP (cURL)](#php-curl)
  - [Node.js (axios)](#nodejsaxios)
- [Token 使用指南](#token-使用指南)
- [最佳实践](#最佳实践)
- [常见问题 FAQ](#常见问题-faq)

---

## 基本信息

| 项目 | 值 |
|------|-----|
| **接口地址** | `https://api.yun52.cn/api/external.php` |
| **请求方式** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | 请求头 `X-API-Key: 你的API Key` |
| **字符编码** | `UTF-8` |

---

## 获取 API Key

API Key 是调用外部接口的必要凭证，由管理员在后台生成。

**获取流程：**

1. 联系认证中心管理员
2. 管理员登录后台 → 「API Key」页面 → 填写你的平台名称 → 生成 Key
3. 管理员将生成的 Key（`ak_` 开头的字符串）提供给你
4. 在所有 API 请求的 Header 中携带：`X-API-Key: ak_xxxxx...`

**注意事项：**

- 每个平台拥有独立的 Key，互不影响
- 管理员可以随时禁用或重新生成你的 Key
- Key 一旦重新生成，旧 Key 立即失效
- 请妥善保管 Key，不要暴露在前端代码或公开仓库中

---

## 通用说明

### 请求格式

所有请求均为 `POST`，Body 为 JSON 格式：

```json
{
    "action": "接口名称",
    "参数1": "值1",
    "参数2": "值2"
}
```

### 响应格式

所有接口返回统一 JSON 结构：

```json
{
    "success": true,
    "message": "描述信息",
    ...其他字段
}
```

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| `200` | 请求已处理（需检查 `success` 字段判断业务是否成功） |
| `401` | API Key 无效、缺失、或已被禁用 |
| `405` | 请求方法不是 POST |
| `429` | 请求频率超限 |

---

## 接口列表

### 1. 用户注册

注册新用户，成功后自动返回登录 Token。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"register"` |
| `username` | string | ✅ | 用户名，3-32 字符，仅支持字母、数字、下划线、中文 |
| `password` | string | ✅ | 密码，最少 8 个字符 |

**请求示例：**

```json
{
    "action": "register",
    "username": "zhangsan",
    "password": "MyPass123!"
}
```

**成功响应：**

```json
{
    "success": true,
    "message": "注册成功",
    "token": "eyJhbGciOi...",
    "username": "zhangsan"
}
```

**失败响应：**

```json
{
    "success": false,
    "message": "用户名已被占用"
}
```

---

### 2. 用户登录

验证用户名和密码，成功返回 Token。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"login"` |
| `username` | string | ✅ | 用户名 |
| `password` | string | ✅ | 密码 |

**成功响应：**

```json
{
    "success": true,
    "message": "登录成功",
    "token": "eyJhbGciOi...",
    "username": "zhangsan"
}
```

**失败响应：**

```json
{
    "success": false,
    "message": "用户名或密码错误"
}
```

> 🔒 无论用户名是否存在，失败时均返回相同错误信息（防枚举攻击）。

---

### 3. 验证 Token

检查用户持有的 Token 是否有效。适用于页面刷新后校验登录状态。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"verify"` |
| `token` | string | ✅ | 登录/注册时获得的 Token |

**成功响应（Token 有效）：**

```json
{
    "success": true,
    "message": "Token 有效",
    "valid": true,
    "username": "zhangsan",
    "expires": "2026-05-16T16:26:00+08:00"
}
```

**失败响应（Token 无效或过期）：**

```json
{
    "success": false,
    "message": "Token 无效或已过期"
}
```

---

### 4. 检查用户名可用性

在注册前提前检查用户名是否已被占用。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"check"` |
| `username` | string | ✅ | 要检查的用户名 |

**响应（用户名可用）：**

```json
{
    "success": true,
    "message": "查询成功",
    "available": true
}
```

**响应（用户名已被占用）：**

```json
{
    "success": true,
    "message": "查询成功",
    "available": false
}
```

---

## 错误码与排错

### 业务错误（HTTP 200，`success: false`）

| 错误消息 | 原因 | 解决方案 |
|----------|------|----------|
| `用户名不能为空` | 请求中未传 `username` | 检查 JSON Body |
| `用户名长度必须在 3-32 个字符之间` | 用户名太短或太长 | 调整用户名长度 |
| `用户名只能包含字母、数字、下划线和中文` | 用户名包含特殊字符 | 去除特殊字符 |
| `密码不能为空` | 请求中未传 `password` | 检查 JSON Body |
| `密码长度不能少于 8 个字符` | 密码太短 | 加长密码 |
| `用户名已被占用` | 注册时用户名已存在 | 换一个用户名，或用 `check` 接口预先查询 |
| `用户名或密码错误` | 登录凭据不正确 | 核对用户名和密码 |
| `Token 不能为空` | verify 请求未传 Token | 检查参数 |
| `Token 无效或已过期` | Token 不正确或超过有效期 | 重新登录获取新 Token |
| `未知 action: xxx` | action 参数不在支持范围内 | 检查拼写 |

### HTTP 错误

| HTTP 状态码 | 错误消息 | 原因 | 解决方案 |
|-------------|----------|------|----------|
| `401` | `无效的 API Key` | X-API-Key 缺失、错误、或已被禁用 | 联系管理员确认 Key 状态 |
| `405` | `仅支持 POST 方法` | 使用了 GET 等其他方法 | 改用 POST |
| `429` | `请求过于频繁，请稍后再试` | 超过频率限制 | 等待 60 秒后重试 |
| `400` | `无效的 JSON 数据` | Body 不是合法 JSON | 检查 JSON 格式 |

---

## 调用示例

### cURL

```bash
# 注册
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"action":"register","username":"zhangsan","password":"MyPass123!"}'

# 登录
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"action":"login","username":"zhangsan","password":"MyPass123!"}'

# 验证 Token
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"action":"verify","token":"eyJhbGciOi..."}'

# 检查用户名
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"action":"check","username":"lisi"}'
```

### JavaScript (fetch)

```javascript
const API_URL = 'https://api.yun52.cn/api/external.php';
const API_KEY = 'ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

async function callAuth(action, params = {}) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ action, ...params }),
    });

    if (response.status === 401) throw new Error('API Key 无效或已被禁用');
    if (response.status === 429) throw new Error('请求过于频繁，请稍后重试');

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
}

// 注册
const result = await callAuth('register', { username: 'zhangsan', password: 'MyPass123!' });
localStorage.setItem('auth_token', result.token);

// 登录
const result = await callAuth('login', { username: 'zhangsan', password: 'MyPass123!' });
localStorage.setItem('auth_token', result.token);

// 验证 Token
const result = await callAuth('verify', { token: localStorage.getItem('auth_token') });

// 检查用户名
const result = await callAuth('check', { username: 'lisi' });
console.log(result.available); // true 或 false
```

### Python (requests)

```python
import requests

API_URL = "https://api.yun52.cn/api/external.php"
API_KEY = "ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}

def call_auth(action: str, **params) -> dict:
    resp = requests.post(API_URL, json={"action": action, **params}, headers=headers, timeout=10)
    if resp.status_code == 401: raise Exception("API Key 无效或已被禁用")
    if resp.status_code == 429: raise Exception("请求过于频繁")
    data = resp.json()
    if not data.get("success"): raise Exception(data.get("message", "未知错误"))
    return data

# 注册
result = call_auth("register", username="zhangsan", password="MyPass123!")

# 登录
result = call_auth("login", username="zhangsan", password="MyPass123!")

# 验证 Token
result = call_auth("verify", token="eyJhbGciOi...")

# 检查用户名
result = call_auth("check", username="lisi")
print(result["available"])
```

### PHP (cURL)

```php
<?php
define('API_URL', 'https://api.yun52.cn/api/external.php');
define('API_KEY', 'ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

function callAuth(string $action, array $params = []): array {
    $ch = curl_init(API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(array_merge(['action' => $action], $params)),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'X-API-Key: ' . API_KEY],
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 401) throw new Exception('API Key 无效或已被禁用');
    if ($httpCode === 429) throw new Exception('请求过于频繁');
    $data = json_decode($response, true);
    if (!$data || !$data['success']) throw new Exception($data['message'] ?? '未知错误');
    return $data;
}

// 注册
$result = callAuth('register', ['username' => 'zhangsan', 'password' => 'MyPass123!']);

// 登录
$result = callAuth('login', ['username' => 'zhangsan', 'password' => 'MyPass123!']);

// 验证 Token
$result = callAuth('verify', ['token' => $token]);
```

### Node.js (axios)

```javascript
const axios = require('axios');
const API_URL = 'https://api.yun52.cn/api/external.php';
const API_KEY = 'ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

async function callAuth(action, params = {}) {
    const { data } = await axios.post(API_URL, { action, ...params }, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        timeout: 10000,
    });
    if (!data.success) throw new Error(data.message);
    return data;
}

// 注册
const result = await callAuth('register', { username: 'zhangsan', password: 'MyPass123!' });

// 登录
const result = await callAuth('login', { username: 'zhangsan', password: 'MyPass123!' });

// 验证 Token
const result = await callAuth('verify', { token: 'eyJhbGciOi...' });
```

---

## Token 使用指南

### Token 生命周期

| 阶段 | 说明 |
|------|------|
| **获取** | 注册或登录成功后由服务端返回 |
| **存储** | 前端存 `localStorage` / 后端存 `Session` 或 `HttpOnly Cookie` |
| **验证** | 调用 `verify` 接口检查有效性 |
| **过期** | 过期后重新登录获取新 Token |
| **有效期** | 默认 24 小时（管理员可在后台调整） |

### 建议的前端存储方式

| 方式 | 安全性 | 适用场景 |
|------|--------|----------|
| `localStorage` | 中等 | 简单 SPA |
| `HttpOnly Cookie` | 高 | 生产环境推荐 |
| `SessionStorage` | 中等 | 关闭标签页自动清除 |

---

## 最佳实践

### 注册流程

```
用户输入用户名 → [check 接口] → 用户输入密码 → [register 接口] → 存储 Token → 跳转首页
```

### 登录流程

```
用户输入凭据 → [login 接口] → 成功存 Token → 跳转
                               → 失败提示（不要暗示是用户名还是密码错）
```

### 登录状态保持

```
页面加载 → 读取 Token → [verify 接口]
  → 有效：显示已登录
  → 无效：清除 Token，跳转登录
```

### 错误处理

```javascript
try {
    const result = await callAuth('login', { username, password });
} catch (e) {
    if (e.message.includes('频繁')) {
        // 提示用户等待
    } else if (e.message.includes('API Key')) {
        // Key 问题，联系管理员
    } else {
        // 展示业务错误
    }
}
```

---

## 常见问题 FAQ

### Q: 为什么登录失败不说"用户名不存在"还是"密码错误"？

安全考虑。统一流报防止攻击者枚举已注册用户名。

### Q: API Key 丢了怎么办？

联系管理员在后台重新生成。旧 Key 立即失效，新 Key 需更新到你的代码中。

### Q: API Key 被禁用了会怎样？

所有携带该 Key 的请求将返回 `401 Unauthorized`。联系管理员启用。

### Q: Token 过期了怎么办？

重新调用 `login` 接口获取新 Token。有效期默认 24 小时，管理员可调整。

### Q: 密码有要求吗？

最少 8 个字符，最长 128 个字符（管理员可调整范围）。

### Q: 用户名支持哪些字符？

字母（a-z, A-Z）、数字（0-9）、下划线（_）、中文。长度 3-32 字符（管理员可调整）。

### Q: 超过频率限制怎么办？

返回 `429` 状态码，等待 60 秒后自动恢复。建议前端做指数退避重试。

### Q: 如何获取 API Key？

联系认证中心管理员，在后台「API Key」页面生成后提供给你。
