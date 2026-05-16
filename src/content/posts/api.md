---
title: 幽云 API调用
published: 2026-05-16
date: 2026-05-15
description: ovo
tags: [API, 幽云]
category: API
author: 洛轻羽
draft: false
---

# 幽云用户系统 API 接入文档

> 面向第三方开发者的接入指南，涵盖注册、登录、Token 验证、房间管理的完整调用说明。

---

## 目录

- [外部站点 API](#基本信息)（`/api/external.php`）
  - [用户注册](#1-用户注册)
  - [用户登录](#2-用户登录)
  - [验证 Token](#3-验证-token)
  - [检查用户名可用性](#4-检查用户名可用性)
  - [修改密码](#5-修改密码)
- [房间 API](#房间-api)（`/api/room.php`）
  - [room_create — 创建房间](#1-room_create--创建房间)
  - [room_join — 加入房间](#2-room_join--加入房间)
  - [room_leave — 离开房间](#3-room_leave--离开房间)
  - [room_list — 房间列表](#4-room_list--房间列表)
  - [room_info — 房间详情](#5-room_info--房间详情)
  - [room_update — 修改房间设置](#6-room_update--修改房间设置仅房主)
  - [room_kick — 踢出成员](#7-room_kick--踢出成员仅房主)
  - [room_delete — 删除房间](#8-room_delete--删除房间仅房主)
  - [room_message — 发送房间消息](#9-room_message--发送房间消息)
- [错误码与排错](#错误码与排错)
- [调用示例](#调用示例)
- [Token 使用指南](#token-使用指南)
- [最佳实践](#最佳实践)
- [常见问题 FAQ](#常见问题-faq)

---

# 外部站点 API

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
| `password` | string | ✅ | 密码，最少 6 个字符 |
| `extra` | any | ❌ | 附加信息（可选），任意 JSON 值，最大 4KB |

**请求示例：**

```json
{
    "action": "register",
    "username": "zhangsan",
    "password": "MyPass123!",
    "extra": {
        "source": "mobile_app",
        "device_id": "ABC123",
        "version": "2.0"
    }
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
| `extra` | any | ❌ | 附加信息（可选），每次登录时可更新 |

**请求示例：**

```json
{
    "action": "login",
    "username": "zhangsan",
    "password": "MyPass123!",
    "extra": {
        "device": "iPhone 15",
        "app_version": "3.1"
    }
}
```

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

**成功响应：**

```json
{
    "success": true,
    "message": "Token 有效",
    "valid": true,
    "username": "zhangsan",
    "expires": "2026-05-16T16:26:00+08:00"
}
```

**失败响应：**

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

### 5. 修改密码

已登录用户修改自己的密码，需要在请求中携带 Token。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"change_password"` |
| `token` | string | ✅ | 登录/注册时获得的 Token |
| `old_password` | string | ✅ | 当前密码 |
| `new_password` | string | ✅ | 新密码，最少 6 个字符 |

**请求示例：**

```json
{
    "action": "change_password",
    "token": "eyJhbGciOi...",
    "old_password": "MyPass123!",
    "new_password": "NewPass456!"
}
```

**成功响应：**

```json
{
    "success": true,
    "message": "密码修改成功"
}
```

**失败响应：**

```json
{
    "success": false,
    "message": "当前密码错误"
}
```

> 🔒 修改密码后，当前 Token 仍然有效（不会被吊销），直到过期。

---

# 房间 API

房间管理接口，支持创建、加入、踢人、消息等操作。

**接口地址：** `https://api.yun52.cn/api/room.php`
**请求方式：** `POST`，Body 为 JSON
**认证方式：** `token` 参数（前端 Token）或 `X-API-Key` 头 + `token` 参数（外部站点）

---

### 1. room_create — 创建房间

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"room_create"` |
| `token` | string | ✅ | 登录 Token |
| `name` | string | ❌ | 房间名（默认"{用户名}的房间"，最长 32 字符） |
| `max_players` | int | ❌ | 最大人数（2-100，默认 4） |
| `is_public` | bool | ❌ | 是否公开（默认 false） |
| `password` | string | ❌ | 房间密码（空表示无密码，最长 64 字符） |
| `extra` | any | ❌ | 自定义附加数据（最大 4KB） |

**响应：**

```json
{"success": true, "room_id": "A1B2C3", "message": "房间创建成功"}
```

---

### 2. room_join — 加入房间

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | ✅ | 固定值 `"room_join"` |
| `token` | string | ✅ | 登录 Token |
| `room_id` | string | ✅ | 房间号（6 位大写十六进制） |
| `password` | string | ❌ | 房间密码（有密码时必填） |

**失败响应：**

```json
{"success": false, "message": "房间不存在"}
{"success": false, "message": "房间已关闭或已开始"}
{"success": false, "message": "你已在该房间中"}
{"success": false, "message": "房间已满"}
{"success": false, "message": "房间密码错误"}
```

---

### 3. room_leave — 离开房间

房主离开时：若房间还有人，自动转移房主；若无人，自动删除房间。

```json
{"action": "room_leave", "token": "...", "room_id": "A1B2C3"}
```

---

### 4. room_list — 房间列表

| 参数 | 说明 |
|------|------|
| `filter` | `all`(默认) / `waiting` / `playing` / `public` |
| `page` | 页码（默认 1） |
| `per_page` | 每页数量（10-50，默认 20） |

**响应：**

```json
{
    "success": true,
    "rooms": [
        {
            "room_id": "A1B2C3",
            "name": "测试房间",
            "owner": "zhangsan",
            "status": "waiting",
            "is_public": true,
            "has_password": false,
            "player_count": 2,
            "max_players": 4,
            "create_time": 1777724669
        }
    ],
    "total": 1,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
}
```

---

### 5. room_info — 房间详情

| 参数 | 说明 |
|------|------|
| `room_id` | 房间号 |

非成员只能查看公开房间。成员可看到消息记录。

**响应：**

```json
{
    "success": true,
    "room": {
        "room_id": "A1B2C3",
        "name": "测试房间",
        "owner": "zhangsan",
        "status": "waiting",
        "is_public": true,
        "has_password": false,
        "max_players": 4,
        "members": [
            {"username": "zhangsan", "role": "owner", "joined_at": "..."},
            {"username": "lisi", "role": "member", "joined_at": "..."}
        ],
        "messages": [...],
        "message_count": 5,
        "create_time": 1777724669,
        "update_time": 1777724700,
        "is_member": true,
        "my_role": "owner",
        "extra": {"game_type": "chess"}
    }
}
```

---

### 6. room_update — 修改房间设置（仅房主）

可更新字段：`name`、`max_players`、`is_public`、`password`、`status`、`extra`

```json
{"action": "room_update", "token": "...", "room_id": "A1B2C3", "name": "新名字", "status": "playing"}
```

---

### 7. room_kick — 踢出成员（仅房主）

```json
{"action": "room_kick", "token": "...", "room_id": "A1B2C3", "kick_username": "lisi"}
```

---

### 8. room_delete — 删除房间（仅房主）

```json
{"action": "room_delete", "token": "...", "room_id": "A1B2C3"}
```

---

### 9. room_message — 发送房间消息

| 参数 | 说明 |
|------|------|
| `room_id` | 房间号 |
| `content` | 消息内容（最大 500 字符） |
| `type` | `text`(默认) / `emoji` / `event` |

消息保留最近 50 条，超出自动淘汰旧消息。

---

## 错误码与排错

### 业务错误（HTTP 200，`success: false`）

| 错误消息 | 原因 | 解决方案 |
|----------|------|----------|
| `用户名不能为空` | 请求中未传 `username` | 检查 JSON Body |
| `用户名长度必须在 3-32 个字符之间` | 用户名太短或太长 | 调整用户名长度 |
| `用户名只能包含字母、数字、下划线和中文` | 用户名包含特殊字符 | 去除特殊字符 |
| `密码不能为空` | 请求中未传 `password` | 检查 JSON Body |
| `密码长度不能少于 6 个字符` | 密码太短 | 加长密码 |
| `用户名已被占用` | 注册时用户名已存在 | 换一个用户名，或用 `check` 接口预先查询 |
| `用户名或密码错误` | 登录凭据不正确 | 核对用户名和密码 |
| `Token 不能为空` | verify 请求未传 Token | 检查参数 |
| `Token 无效或已过期` | Token 不正确或超过有效期 | 重新登录获取新 Token |
| `新密码不能为空` | change_password 未传新密码 | 检查 JSON Body |
| `新密码不能与当前密码相同` | 新旧密码一样 | 使用不同密码 |
| `当前密码错误` | change_password 旧密码不正确 | 核对当前密码 |
| `请先登录` | 未传 Token | 携带有效 Token |
| `附加信息过大（最大 4KB）` | extra 字段超过限制 | 精简附加数据 |
| `房间不存在` | room 操作找不到房间 | 检查 room_id |
| `房间已满` | room_join 人数已满 | 等待有人离开 |
| `房间密码错误` | room_join 密码不正确 | 输入正确密码 |
| `仅房主可修改房间设置` | room_update 非房主操作 | 只有房主能改 |
| `仅房主可踢出成员` | room_kick 非房主操作 | 只有房主能踢人 |
| `你不在该房间中` | room_message 非成员 | 先加入房间 |
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
  -H "X-API-Key: ak_xxxxx..." \
  -d '{"action":"register","username":"zhangsan","password":"MyPass123!"}'

# 登录
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxx..." \
  -d '{"action":"login","username":"zhangsan","password":"MyPass123!"}'

# 验证 Token
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxx..." \
  -d '{"action":"verify","token":"eyJhbGciOi..."}'

# 检查用户名
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxx..." \
  -d '{"action":"check","username":"lisi"}'

# 修改密码
curl -X POST "https://api.yun52.cn/api/external.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxxxx..." \
  -d '{"action":"change_password","token":"eyJhbGciOi...","old_password":"OldPass!","new_password":"NewPass!"}'

# 创建房间
curl -X POST "https://api.yun52.cn/api/room.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"room_create","token":"eyJhbGciOi...","name":"测试房间","max_players":4,"is_public":true}'

# 加入房间
curl -X POST "https://api.yun52.cn/api/room.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"room_join","token":"eyJhbGciOi...","room_id":"A1B2C3"}'

# 房间列表
curl -X POST "https://api.yun52.cn/api/room.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"room_list","token":"eyJhbGciOi...","filter":"public"}'

# 发送房间消息
curl -X POST "https://api.yun52.cn/api/room.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"room_message","token":"eyJhbGciOi...","room_id":"A1B2C3","content":"你好"}'
```

### JavaScript (fetch)

```javascript
const API_URL = 'https://api.yun52.cn/api/external.php';
const ROOM_URL = 'https://api.yun52.cn/api/room.php';
const API_KEY = 'ak_xxxxx...';

async function callAuth(action, params = {}) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ action, ...params }),
    });
    if (res.status === 401) throw new Error('API Key 无效');
    if (res.status === 429) throw new Error('请求过于频繁');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
}

async function roomApi(action, params = {}) {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(ROOM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token, ...params }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
}

// 外部 API
await callAuth('register', { username: 'zhangsan', password: 'MyPass123!' });
await callAuth('login', { username: 'zhangsan', password: 'MyPass123!' });
await callAuth('verify', { token: '...' });
await callAuth('check', { username: 'lisi' });
await callAuth('change_password', { token: '...', old_password: 'Old!', new_password: 'New!' });

// 房间 API
await roomApi('room_create', { name: '我的房间', max_players: 4, is_public: true });
await roomApi('room_join', { room_id: 'A1B2C3' });
const { rooms } = await roomApi('room_list', { filter: 'public' });
await roomApi('room_message', { room_id: 'A1B2C3', content: '你好' });
```

### Python (requests)

```python
import requests

API_URL = "https://api.yun52.cn/api/external.php"
ROOM_URL = "https://api.yun52.cn/api/room.php"
API_KEY = "ak_xxxxx..."
headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}

def call_auth(action, **params):
    r = requests.post(API_URL, json={"action": action, **params}, headers=headers, timeout=10)
    if r.status_code == 401: raise Exception("API Key 无效")
    data = r.json()
    if not data.get("success"): raise Exception(data.get("message", "未知错误"))
    return data

def room_api(action, token, **params):
    r = requests.post(ROOM_URL, json={"action": action, "token": token, **params}, headers=headers, timeout=10)
    data = r.json()
    if not data.get("success"): raise Exception(data.get("message", "未知错误"))
    return data

# 外部 API
call_auth("register", username="zhangsan", password="MyPass123!")
call_auth("login", username="zhangsan", password="MyPass123!")
call_auth("verify", token="eyJ...")
call_auth("check", username="lisi")
call_auth("change_password", token="eyJ...", old_password="Old!", new_password="New!")

# 房间 API
room_api("room_create", token="eyJ...", name="测试房间", max_players=4, is_public=True)
room_api("room_join", token="eyJ...", room_id="A1B2C3")
room_api("room_list", token="eyJ...", filter="public")
room_api("room_message", token="eyJ...", room_id="A1B2C3", content="你好")
```

### PHP (cURL)

```php
<?php
define('API_URL', 'https://api.yun52.cn/api/external.php');
define('ROOM_URL', 'https://api.yun52.cn/api/room.php');
define('API_KEY', 'ak_xxxxx...');

function callAuth(string $action, array $params = []): array {
    $ch = curl_init(API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(array_merge(['action' => $action], $params)),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-API-Key: ' . API_KEY],
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode === 401) throw new Exception('API Key 无效');
    $data = json_decode($response, true);
    if (!$data || !$data['success']) throw new Exception($data['message'] ?? '未知错误');
    return $data;
}

function roomApi(string $action, string $token, array $params = []): array {
    $ch = curl_init(ROOM_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(array_merge(['action' => $action, 'token' => $token], $params)),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    if (!$data || !$data['success']) throw new Exception($data['message'] ?? '未知错误');
    return $data;
}

// 外部 API
callAuth('register', ['username' => 'zhangsan', 'password' => 'MyPass123!']);
callAuth('login', ['username' => 'zhangsan', 'password' => 'MyPass123!']);
callAuth('verify', ['token' => $token]);
callAuth('change_password', ['token' => $token, 'old_password' => 'Old!', 'new_password' => 'New!']);

// 房间 API
roomApi('room_create', $token, ['name' => '测试房间', 'max_players' => 4, 'is_public' => true]);
roomApi('room_join', $token, ['room_id' => 'A1B2C3']);
```

### Node.js (axios)

```javascript
const axios = require('axios');
const API_URL = 'https://api.yun52.cn/api/external.php';
const ROOM_URL = 'https://api.yun52.cn/api/room.php';
const API_KEY = 'ak_xxxxx...';

async function callAuth(action, params = {}) {
    const { data } = await axios.post(API_URL, { action, ...params }, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        timeout: 10000,
    });
    if (!data.success) throw new Error(data.message);
    return data;
}

async function roomApi(action, token, params = {}) {
    const { data } = await axios.post(ROOM_URL, { action, token, ...params }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
    });
    if (!data.success) throw new Error(data.message);
    return data;
}

// 外部 API
await callAuth('register', { username: 'zhangsan', password: 'MyPass123!' });
await callAuth('login', { username: 'zhangsan', password: 'MyPass123!' });
await callAuth('verify', { token: 'eyJ...' });
await callAuth('change_password', { token: 'eyJ...', old_password: 'Old!', new_password: 'New!' });

// 房间 API
await roomApi('room_create', token, { name: '测试房间', max_players: 4, is_public: true });
await roomApi('room_join', token, { room_id: 'A1B2C3' });
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

最少 6 个字符，最长 128 个字符（管理员可调整范围）。

### Q: 用户名支持哪些字符？

字母（a-z, A-Z）、数字（0-9）、下划线（_）、中文。长度 3-32 字符（管理员可调整）。

### Q: 超过频率限制怎么办？

返回 `429` 状态码，等待 60 秒后自动恢复。建议前端做指数退避重试。

### Q: 如何获取 API Key？

联系认证中心管理员，在后台「API Key」页面生成后提供给你。

### Q: extra 字段是什么？

`extra` 是一个可选的附加信息字段，你可以在注册或登录时传入任意 JSON 值（如设备信息、来源渠道、版本号等），系统会将其保存到用户数据中。每次登录时传入新的 `extra` 会覆盖之前的值。管理员可在后台查看每个用户的 `extra` 数据。

### Q: 如何修改密码？

调用 `change_password` 接口，需要携带当前登录的 Token、当前密码和新密码。详见接口文档中的「修改密码」章节。

### Q: 房间 API 怎么用？

房间 API 需要用户先登录获取 Token，然后通过 `/api/room.php` 调用。支持创建、加入、踢人、发消息等操作。房间号为 6 位大写十六进制（如 A1B2C3）。房主离开时自动转移房主，无人时自动删除房间。详见「房间 API」章节。

### Q: 房间密码安全吗？

房间密码使用 bcrypt 哈希存储（cost=8），与用户密码同样安全。加入时需要输入正确密码。
