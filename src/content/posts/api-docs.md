---
title: 幽云 API调用
published: 2026-05-15
date: 2026-05-15
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
| **接口地址** | `https://yourdomain.com/api/external.php` |
| **请求方式** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | 请求头 `X-API-Key: YOUR_API_KEY` |
| **字符编码** | `UTF-8` |

> ⚠️ 所有接口均需在请求头中携带 `X-API-Key`，否则返回 `401 Unauthorized`。

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
    "success": true,          // 布尔值，是否成功
    "message": "描述信息",     // 人类可读的结果说明
    ...其他字段                // 部分接口附带额外数据
}
```

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| `200` | 请求已处理（需检查 `success` 字段判断业务是否成功） |
| `401` | API Key 无效或缺失 |
| `405` | 请求方法不是 POST |
| `429` | 请求频率超限（每 IP 每分钟 30 次） |

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
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ6aGFuZ3NhbiIsImlhdCI6MTcxNTc2MjQwMCwiZXhwIjoxNzE1ODQ4ODAwfQ.aBcDeFgHiJkLmNoPqRsTuVwXyZ",
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

**请求示例：**

```json
{
    "action": "login",
    "username": "zhangsan",
    "password": "MyPass123!"
}
```

**成功响应：**

```json
{
    "success": true,
    "message": "登录成功",
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ6aGFuZ3NhbiIsImlhdCI6MTcxNTc2MjQwMCwiZXhwIjoxNzE1ODQ4ODAwfQ.aBcDeFgHiJkLmNoPqRsTuVwXyZ",
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

**请求示例：**

```json
{
    "action": "verify",
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJ..."
}
```

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

**请求示例：**

```json
{
    "action": "check",
    "username": "lisi"
}
```

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
| `用户名不能为空` | 请求中未传 `username` | 检查 JSON Body 是否正确 |
| `用户名长度必须在 3-32 个字符之间` | 用户名太短或太长 | 调整用户名长度 |
| `用户名只能包含字母、数字、下划线和中文` | 用户名包含特殊字符 | 去除特殊字符 |
| `密码不能为空` | 请求中未传 `password` | 检查 JSON Body |
| `密码长度不能少于 8 个字符` | 密码太短 | 加长密码 |
| `用户名已被占用` | 注册时用户名已存在 | 换一个用户名，或用 `check` 接口预先查询 |
| `用户名或密码错误` | 登录凭据不正确 | 核对用户名和密码 |
| `Token 不能为空` | verify 请求未传 Token | 检查参数 |
| `Token 无效或已过期` | Token 不正确或超过 24 小时 | 重新登录获取新 Token |
| `未知 action: xxx` | action 参数不在支持范围内 | 检查拼写，使用 `register/login/verify/check` |

### HTTP 错误

| HTTP 状态码 | 错误消息 | 原因 | 解决方案 |
|-------------|----------|------|----------|
| `401` | `无效的 API Key` | X-API-Key 缺失或错误 | 检查请求头中的 API Key |
| `405` | `仅支持 POST 方法` | 使用了 GET 等其他方法 | 改用 POST |
| `429` | `请求过于频繁，请稍后再试` | 超过每分钟 30 次限制 | 等待 60 秒后重试，或做指数退避 |
| `400` | `无效的 JSON 数据` | Body 不是合法 JSON | 检查 JSON 格式 |

---

## 调用示例

### cURL

```bash
# 注册
curl -X POST "https://yourdomain.com/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"action":"register","username":"zhangsan","password":"MyPass123!"}'

# 登录
curl -X POST "https://yourdomain.com/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"action":"login","username":"zhangsan","password":"MyPass123!"}'

# 验证 Token
curl -X POST "https://yourdomain.com/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"action":"verify","token":"eyJhbGciOi..."}'

# 检查用户名
curl -X POST "https://yourdomain.com/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"action":"check","username":"lisi"}'
```

### JavaScript (fetch)

```javascript
const API_URL = 'https://yourdomain.com/api/external.php';
const API_KEY = 'YOUR_API_KEY';

async function callAuth(action, params = {}) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ action, ...params }),
    });

    if (response.status === 401) {
        throw new Error('API Key 无效');
    }
    if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message);
    }
    return data;
}

// ========== 使用示例 ==========

// 注册
try {
    const result = await callAuth('register', {
        username: 'zhangsan',
        password: 'MyPass123!',
    });
    console.log('注册成功，Token:', result.token);
    localStorage.setItem('auth_token', result.token);
} catch (e) {
    console.error('注册失败:', e.message);
}

// 登录
try {
    const result = await callAuth('login', {
        username: 'zhangsan',
        password: 'MyPass123!',
    });
    console.log('登录成功，Token:', result.token);
    localStorage.setItem('auth_token', result.token);
} catch (e) {
    console.error('登录失败:', e.message);
}

// 验证 Token（页面加载时）
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.log('未登录');
        return null;
    }

    try {
        const result = await callAuth('verify', { token });
        console.log('已登录，用户:', result.username);
        return result.username;
    } catch {
        localStorage.removeItem('auth_token');
        console.log('Token 已过期，请重新登录');
        return null;
    }
}

// 检查用户名是否可用（实时校验）
async function checkUsernameAvailable(username) {
    try {
        const result = await callAuth('check', { username });
        return result.available; // true = 可用, false = 已被占用
    } catch {
        return null; // 查询失败
    }
}
```

### Python (requests)

```python
import requests

API_URL = "https://yourdomain.com/api/external.php"
API_KEY = "YOUR_API_KEY"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
}

def call_auth(action: str, **params) -> dict:
    """调用认证 API"""
    payload = {"action": action, **params}
    resp = requests.post(API_URL, json=payload, headers=headers, timeout=10)
    
    if resp.status_code == 401:
        raise Exception("API Key 无效")
    if resp.status_code == 429:
        raise Exception("请求过于频繁")
    
    data = resp.json()
    if not data.get("success"):
        raise Exception(data.get("message", "未知错误"))
    return data


# ========== 使用示例 ==========

# 注册
try:
    result = call_auth("register", username="zhangsan", password="MyPass123!")
    print(f"注册成功: {result['username']}")
    token = result["token"]
except Exception as e:
    print(f"注册失败: {e}")

# 登录
try:
    result = call_auth("login", username="zhangsan", password="MyPass123!")
    print(f"登录成功: {result['username']}")
    token = result["token"]
except Exception as e:
    print(f"登录失败: {e}")

# 验证 Token
try:
    result = call_auth("verify", token=token)
    print(f"Token 有效，用户: {result['username']}，过期时间: {result['expires']}")
except Exception as e:
    print(f"Token 无效: {e}")

# 检查用户名
try:
    result = call_auth("check", username="lisi")
    if result["available"]:
        print("用户名可用")
    else:
        print("用户名已被占用")
except Exception as e:
    print(f"查询失败: {e}")
```

### PHP (cURL)

```php
<?php

define('API_URL', 'https://yourdomain.com/api/external.php');
define('API_KEY', 'YOUR_API_KEY');

function callAuth(string $action, array $params = []): array {
    $payload = json_encode(array_merge(['action' => $action], $params));
    
    $ch = curl_init(API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'X-API-Key: ' . API_KEY,
        ],
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("网络错误: {$error}");
    }
    if ($httpCode === 401) {
        throw new Exception("API Key 无效");
    }
    if ($httpCode === 429) {
        throw new Exception("请求过于频繁");
    }
    
    $data = json_decode($response, true);
    if (!$data) {
        throw new Exception("响应解析失败 (HTTP {$httpCode})");
    }
    if (!$data['success']) {
        throw new Exception($data['message'] ?? '未知错误');
    }
    
    return $data;
}

// ========== 使用示例 ==========

// 注册
try {
    $result = callAuth('register', [
        'username' => 'zhangsan',
        'password' => 'MyPass123!',
    ]);
    echo "注册成功！Token: " . $result['token'] . "\n";
    // 存入 Session
    session_start();
    $_SESSION['auth_token']    = $result['token'];
    $_SESSION['auth_username'] = $result['username'];
} catch (Exception $e) {
    echo "注册失败: " . $e->getMessage() . "\n";
}

// 登录
try {
    $result = callAuth('login', [
        'username' => 'zhangsan',
        'password' => 'MyPass123!',
    ]);
    echo "登录成功！用户: " . $result['username'] . "\n";
} catch (Exception $e) {
    echo "登录失败: " . $e->getMessage() . "\n";
}

// 验证 Token（页面加载时）
session_start();
if (!empty($_SESSION['auth_token'])) {
    try {
        $result = callAuth('verify', [
            'token' => $_SESSION['auth_token'],
        ]);
        echo "当前登录用户: " . $result['username'] . "\n";
    } catch (Exception $e) {
        // Token 失效，清除 Session
        session_destroy();
        echo "登录已过期，请重新登录\n";
    }
}
```

### Node.js (axios)

```javascript
const axios = require('axios');

const API_URL = 'https://yourdomain.com/api/external.php';
const API_KEY = 'YOUR_API_KEY';

async function callAuth(action, params = {}) {
    try {
        const { data } = await axios.post(API_URL, 
            { action, ...params },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                timeout: 10000,
            }
        );

        if (!data.success) {
            throw new Error(data.message);
        }
        return data;
    } catch (err) {
        if (err.response) {
            if (err.response.status === 401) throw new Error('API Key 无效');
            if (err.response.status === 429) throw new Error('请求过于频繁');
        }
        throw err;
    }
}

// ========== 使用示例 ==========

(async () => {
    // 注册
    try {
        const res = await callAuth('register', {
            username: 'zhangsan',
            password: 'MyPass123!',
        });
        console.log('注册成功:', res.username);
        const token = res.token;
    } catch (e) {
        console.error('注册失败:', e.message);
    }

    // 登录
    try {
        const res = await callAuth('login', {
            username: 'zhangsan',
            password: 'MyPass123!',
        });
        console.log('登录成功:', res.username);
    } catch (e) {
        console.error('登录失败:', e.message);
    }

    // 验证 Token
    try {
        const res = await callAuth('verify', { token: 'eyJhbGciOi...' });
        console.log('Token 有效，用户:', res.username);
    } catch (e) {
        console.error('Token 无效:', e.message);
    }
})();
```

---

## Token 使用指南

### Token 结构

```
header.payload.signature
```

三段以 `.` 分隔，均为 URL-safe Base64 编码。

### Token 生命周期

| 阶段 | 说明 |
|------|------|
| **获取** | 注册或登录成功后由服务端返回 |
| **存储** | 前端存 `localStorage` / 后端存 `Session` 或 `HttpOnly Cookie` |
| **使用** | 每次需要认证的请求带上 Token |
| **验证** | 调用 `verify` 接口检查有效性 |
| **刷新** | 过期后重新登录获取新 Token（当前不支持静默刷新） |
| **有效期** | 24 小时（可在服务端配置） |

### 建议的前端存储方式

| 方式 | 安全性 | 适用场景 |
|------|--------|----------|
| `localStorage` | 中等 | 简单 SPA，XSS 风险可控 |
| `HttpOnly Cookie` | 高 | 生产环境推荐，JS 不可读 |
| `SessionStorage` | 中等 | 关闭标签页自动清除 |

---

## 最佳实践

### 1. 注册流程

```
用户输入用户名 → [check 接口检查可用性] → 用户输入密码 → [register 接口] → 存储 Token → 跳转首页
```

### 2. 登录流程

```
用户输入凭据 → [login 接口] → 成功则存储 Token → 跳转
                               → 失败则提示错误（不要暗示是用户名还是密码错）
```

### 3. 登录状态保持

```
页面加载 → 读取本地 Token → [verify 接口]
  → 有效：显示已登录状态
  → 无效/过期：清除 Token，跳转登录页
```

### 4. 请求频率控制

```javascript
// 前端做基本的防抖/节流
let lastRequest = 0;
async function rateLimitedCall(action, params) {
    const now = Date.now();
    if (now - lastRequest < 2000) {  // 至少间隔 2 秒
        throw new Error('操作过于频繁');
    }
    lastRequest = now;
    return callAuth(action, params);
}
```

### 5. 错误处理

```javascript
try {
    const result = await callAuth('login', { username, password });
    // 成功逻辑
} catch (e) {
    if (e.message.includes('频繁')) {
        // 提示用户等待
    } else if (e.message.includes('API Key')) {
        // 系统配置错误，记录日志
        console.error('API Key 配置异常');
    } else {
        // 展示业务错误（用户名密码错误等）
        showTip(e.message);
    }
}
```

---

## 常见问题 FAQ

### Q: 为什么登录失败时不说"用户名不存在"还是"密码错误"？

**安全考虑。** 如果分开提示，攻击者可以枚举出哪些用户名已注册。统一返回"用户名或密码错误"可防止此类信息泄露。

### Q: Token 过期了怎么办？

重新调用 `login` 接口获取新 Token。建议在前端 Token 快过期时（如剩余 1 小时内）主动引导用户重新登录。

### Q: 一个用户名能注册多次吗？

不能。`register` 接口会检查用户名唯一性，重复注册会返回"用户名已被占用"。可在注册前调用 `check` 接口实时校验。

### Q: 超过频率限制怎么办？

服务端返回 `429` 状态码，Body 中包含 `retry_after: 60`（秒）。建议在前端做指数退避：

```javascript
async function callWithRetry(action, params, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await callAuth(action, params);
        } catch (e) {
            if (e.message.includes('频繁') && i < maxRetries - 1) {
                await new Promise(r => setTimeout(r, (i + 1) * 2000));
                continue;
            }
            throw e;
        }
    }
}
```

### Q: 密码有要求吗？

最少 8 个字符，最长 128 个字符。建议用户使用大小写字母 + 数字 + 特殊字符的组合。

### Q: 用户名支持哪些字符？

字母（a-z, A-Z）、数字（0-9）、下划线（_）、中文。长度 3-32 个字符。

### Q: 接口有调用频率限制吗？

每 IP 每分钟最多 30 次请求（所有接口共享）。超出后返回 `429`，等待 60 秒自动恢复。

### Q: 如何获取 API Key？

联系认证中心管理员，在 `api/config.php` 中配置后提供给你。API Key 是调用外部接口的必要凭证。
