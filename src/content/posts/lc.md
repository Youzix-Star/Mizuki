---
title: 幽云API 流程文档
published: 2026-05-15
description: 幽云用户系统API完整流程文档
tags: [API, 幽云, 流程文档]
category: API
author: 洛轻羽
draft: false
---

# 幽云用户系统 — API 完整流程文档

> 本文档从架构、数据流、认证机制三个维度，完整描述幽云用户系统 API 的内部工作流程。

---

## 目录

- [系统架构](#系统架构)
- [请求生命周期](#请求生命周期)
- [认证体系](#认证体系)
  - [用户 Token](#用户-token)
  - [API Key](#api-key)
  - [管理员 Token](#管理员-token)
- [数据流详解](#数据流详解)
  - [注册流程](#注册流程)
  - [登录流程](#登录流程)
  - [Token 验证流程](#token-验证流程)
  - [用户名检查流程](#用户名检查流程)
  - [管理员操作流程](#管理员操作流程)
- [安全机制](#安全机制)
- [文件存储结构](#文件存储结构)
- [时序图](#时序图)

---

## 系统架构

```mermaid
graph TD
    subgraph 客户端
        style 客户端 fill:#e1f5fe,stroke:#0288d1
        FE[前端页面<br/>index.html]
        ADMIN[管理后台<br/>admin.html]
        EXT[外部站点<br/>第三方APP]
    end

    subgraph 入口处理
        style 入口处理 fill:#e8f5e9,stroke:#2e7d32
        AUTH[auth.php]
        ADMP[admin.php]
        EXTP[external.php]
    end

    FE --> AUTH
    ADMIN --> ADMP
    EXT --> EXTP

    subgraph 核心中间件链
        style 核心中间件链 fill:#fff3e0,stroke:#ef6c00
        MW[middleware.php<br/>CORS / 限流 / API Key 验证]
        TOKEN[token.php<br/>Token 生成 / 验证]
        CONFIG[config.php<br/>配置加载<br/>settings.json 覆盖]
        DB[db.php<br/>JSON 文件读写<br/>flock 锁]
        MW --> TOKEN --> CONFIG --> DB
    end

    AUTH --> MW
    ADMP --> MW

    DB --> DATA[("data/ 目录<br/>users.json, admin.json<br/>settings.json, api_keys.json<br/>rate_limit.json, admin.log")]
    style DATA fill:#f3e5f5,stroke:#7b1fa2
```

---

## 请求生命周期

每个 API 请求经历以下阶段：

```mermaid
graph TD
    %% 节点样式定义
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#f9a825,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([客户端请求]) --> MethodCheck{① HTTP 方法检查}
    
    MethodCheck -- 非 POST --> E405[405 Method Not Allowed]:::error
    MethodCheck -- POST --> Cors[② CORS / 安全头设置]:::process
    
    Cors --> ApiCheck{③ API Key 验证<br/>仅 external.php}
    ApiCheck -- 需要验证 --> KeyLookup[检查 X-API-Key<br/>查找 api_keys.json<br/>或 config.php 兼容]:::process
    KeyLookup -- 有效 --> RateCheck{④ 速率限制<br/>IP 滑动窗口 60s}
    KeyLookup -- 无效 --> E401[401 Unauthorized]:::error
    
    ApiCheck -- 无需验证 --> RateCheck
    
    RateCheck -- 超限 --> E429[429 Too Many Requests]:::error
    RateCheck -- 未超限 --> JsonCheck{⑤ JSON Body 解析}
    
    JsonCheck -- 格式错误 --> E400[400 Bad Request]:::error
    JsonCheck -- 成功 --> Route[⑥ Action 路由分发]:::process
    
    Route --> Biz[⑦ 业务逻辑处理<br/>· 输入校验<br/>· 数据库操作 flock 锁<br/>· Token 生成/验证]:::process
    
    Biz --> FinalResp[⑧ JSON 响应<br/>success: true/false]:::success

    %% 连接线带箭头，自动生成
```

---

## 认证体系

系统有三套独立的认证机制：

### 用户 Token

| 属性 | 说明 |
|------|------|
| **用途** | 前端用户登录状态维持 |
| **算法** | HMAC-SHA256 签名 |
| **结构** | `base64(header).base64(payload).signature` |
| **有效期** | 默认 24 小时（可配置） |
| **存储** | 前端 localStorage |
| **签发** | 注册/登录成功后自动返回 |

**Token 结构：**

```
Header:    {"alg":"HS256","typ":"AUTH"}
Payload:   {"sub":"用户名","iat":签发时间,"exp":过期时间}
Signature: HMAC-SHA256(header.payload, token_secret)
```

**验证流程：**
1. 拆分 Token 为三段
2. 用 `token_secret` 重新计算签名，与 Token 中的签名比对（`hash_equals` 防时序攻击）
3. 解析 Payload，检查 `exp` 是否过期
4. 返回 Payload（含用户名 `sub`）或 `null`

### API Key

| 属性 | 说明 |
|------|------|
| **用途** | 第三方站点调用外部 API 的凭证 |
| **格式** | `ak_` + 48 位十六进制（共 51 字符） |
| **生成** | 管理员后台按平台生成 |
| **传递** | 请求头 `X-API-Key: ak_xxx...` |
| **特性** | 每平台独立，可启用/禁用/重新生成 |

**验证流程：**
1. 读取 `X-API-Key` 请求头
2. 遍历 `data/api_keys.json`，用 `hash_equals` 安全比对
3. 匹配成功且 Key 状态为 `enabled` → 更新 `last_used` 时间戳
4. 向下兼容 `config.php` 中的静态 `api_secret_key`

### 管理员 Token

| 属性 | 说明 |
|------|------|
| **用途** | 管理后台身份验证 |
| **算法** | 同用户 Token（HMAC-SHA256） |
| **有效期** | 2 小时 |
| **密钥** | `admin_` + 管理员密码哈希 |
| **签发** | 管理员密码验证通过后返回 |

> ⚠️ 管理员密码修改后，所有已有 Token 立即失效（密钥变了）。

---

## 数据流详解

### 注册流程

```mermaid
graph TD
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#f9a825,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([用户输入用户名 + 密码]) --> Validate[输入校验]:::process
    
    Validate --> CheckUser{用户名格式<br/>长度 3-32<br/>允许字母/数字/_/中文}
    CheckUser -- 格式错误 --> ErrUser[返回错误<br/>用户名无效]:::error
    CheckUser -- 通过 --> CheckPass{密码格式<br/>长度 8-128}
    CheckPass -- 格式错误 --> ErrPass[返回错误<br/>密码无效]:::error
    CheckPass -- 通过 --> UniqueCheck{检查用户名唯一性}
    
    UniqueCheck -- 已存在 --> ErrExists[返回错误<br/>用户名已占用]:::error
    UniqueCheck -- 不存在 --> Hash[密码哈希<br/>bcrypt, cost=12]:::process
    
    Hash --> WriteLock[写入 users.json<br/>获取排他锁 flock LOCK_EX]:::process
    WriteLock --> ReadAppend[读取文件 → 追加用户 → 写回]:::process
    ReadAppend --> Unlock[截断 → 释放锁]:::process
    
    Unlock --> GenToken[生成 Token<br/>Header.Payload + HMAC-SHA256]:::process
    
    GenToken --> Resp[返回成功<br/>token, username]:::success
```

### 登录流程

```mermaid
graph TD
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#f9a825,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([用户输入用户名 + 密码]) --> Validate{非空校验}
    
    Validate -- 为空 --> ErrCommon[返回<br/>用户名或密码错误]:::error
    Validate -- 非空 --> FindUser[查找用户<br/>db->findUser]:::process
    
    FindUser -- 用户不存在 --> ErrCommon
    FindUser -- 用户存在 --> Verify[密码验证<br/>password_verify]:::process
    
    Verify -- 不匹配 --> ErrCommon
    Verify -- 匹配 --> UpdateTime[更新 last_login 时间戳<br/>db->saveUser]:::process
    
    UpdateTime --> GenToken[生成 Token<br/>Header.Payload + HMAC-SHA256]:::process
    
    GenToken --> Resp[返回<br/>success, token, username]:::success
```

### Token 验证流程

```mermaid
graph TD
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#f9a825,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([前端读取 localStorage 中的 Token]) --> Request[POST /api/auth.php<br/>action: verify, token]:::process
    Request --> Verify[token->verify<br/>· 拆分三段<br/>· 验证签名 HMAC-SHA256<br/>· 检查过期时间]:::process
    Verify --> DecResult{验证结果}
    
    DecResult -- 有效 --> RespOK[返回<br/>success: true<br/>username, expires]:::success
    DecResult -- 无效/过期 --> RespFail[返回<br/>success: false<br/>message: Token 无效或已过期<br/><br/>前端清除 localStorage<br/>跳转登录页]:::error
```

### 用户名检查流程

```mermaid
graph TD
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([外部站点调用 check 接口]) --> Request[POST /api/external.php<br/>Headers: X-API-Key<br/>Body: action=check, username]:::process
    Request --> Mid[前置安全检查<br/>API Key 验证 → 速率限制 → 输入校验]:::process
    Mid --> Query[db->userExists<br/>检查用户名是否存在]:::process
    Query --> Resp[返回<br/>success: true<br/>available: true/false]:::success
```

### 管理员操作流程

```mermaid
graph TD
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#f9a825,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#b71c1c;
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    Start([管理员打开 admin.html]) --> Guard{前端守卫层<br/>检查 localStorage<br/>admin_token}
    
    Guard -- 无 Token --> ShowLogin[显示登录页]:::process
    Guard -- 有 Token --> CheckToken{调用 check_token 验证}
    CheckToken -- 有效 --> EnterAdmin[进入后台]:::success
    CheckToken -- 无效 --> ClearToken[清除 Token<br/>显示登录页]:::error
    ShowLogin --> LoginAction[管理员输入密码并登录]:::process
    ClearToken --> LoginAction
    
    LoginAction --> PostLogin[POST admin.php<br/>action: login, password]:::process
    PostLogin --> AuthPass{验证 bcrypt 哈希}
    AuthPass -- 失败 --> ErrLogin[返回错误<br/>登录失败]:::error
    AuthPass -- 成功 --> GenAdminToken[生成管理员 Token<br/>密钥 = admin_ + 密码哈希]:::process
    GenAdminToken --> ReturnToken[返回 Token]:::success
    
    ReturnToken --> EnterAdmin
    
    EnterAdmin --> Operation[管理员发起操作请求<br/>自动携带 Token]:::process
    Operation --> AdminCheck{verifyAdmin 检查}
    AdminCheck -- 失败 --> OpErr[Token 无效<br/>拒绝访问]:::error
    AdminCheck -- 通过 --> RateLimit[速率限制]:::process
    RateLimit --> BizLogic[执行业务逻辑]:::process
    BizLogic --> AuditLog[写入操作日志<br/>admin.log]:::process
    AuditLog --> OpResult[返回操作结果]:::success
```

---

## 安全机制

| 层级 | 措施 | 实现 |
|------|------|------|
| **传输** | CORS 白名单 | `middleware.php` → `allowed_origins` |
| **传输** | 安全响应头 | `X-Content-Type-Options`, `X-Frame-Options`, `no-cache` |
| **认证** | API Key 动态管理 | 按平台生成，支持启用/禁用，`hash_equals` 比对 |
| **认证** | Token HMAC-SHA256 签名 | 防篡改，含过期时间 |
| **认证** | 管理员独立密码 | bcrypt (cost=12)，Token 2 小时过期 |
| **数据** | 密码 bcrypt 哈希 | cost=12，不可逆 |
| **数据** | 文件锁 (flock) | 并发安全读写 |
| **数据** | .htaccess | 禁止 Web 直接访问 .json |
| **防攻击** | 速率限制 | 每 IP 每分钟可配置次数，滑动窗口 |
| **防攻击** | 统一错误消息 | 登录失败不区分用户名/密码，防枚举 |
| **防攻击** | 输入严格校验 | 用户名/密码长度、格式白名单 |
| **防攻击** | 延迟响应 | 用户不存在时也执行一次 `password_verify`，防止通过响应时间判断 |
| **审计** | 操作日志 | 管理员所有操作记录到 `admin.log` |

---

## 文件存储结构

### users.json

```json
{
  "zhangsan": {
    "username": "zhangsan",
    "password": "$2y$12$...（bcrypt 哈希）",
    "created": "2026-05-15T10:00:00+08:00",
    "last_login": "2026-05-15T18:00:00+08:00",
    "banned": false
  }
}
```

> Key 为小写用户名，`username` 字段保留原始大小写。

### api_keys.json

```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "platform": "官方网站",
    "key": "ak_abcdef1234567890...",
    "enabled": true,
    "created": "2026-05-15T10:00:00+08:00",
    "last_used": "2026-05-15T18:00:00+08:00"
  }
]
```

### admin.json

```json
{
  "password": "$2y$12$...（bcrypt 哈希）",
  "created": "2026-05-15T10:00:00+08:00"
}
```

### settings.json

```json
{
  "allowed_origins": ["https://api.yun52.cn"],
  "rate_limit": 30,
  "token_ttl": 86400,
  "username_min": 3,
  "username_max": 32,
  "password_min": 8,
  "password_max": 128
}
```

### admin.log

```
[2026-05-15T10:30:00+08:00] APIKEY_CREATE: 官方网站 (a1b2c3d4) | IP: 1.2.3.4
[2026-05-15T10:35:00+08:00] TOGGLE_BAN: baduser → 已封禁 | IP: 1.2.3.4
[2026-05-15T10:40:00+08:00] SAVE_SETTINGS: rate_limit, token_ttl | IP: 1.2.3.4
```

---

## 时序图

### 完整的第三方站点集成流程

```mermaid
sequenceDiagram
    autonumber
    participant Third as 第三方站点
    participant API as 幽云 API
    participant DB as 数据层

    %% 注册流程
    Third->>API: POST /external.php<br/>Header: X-API-Key<br/>Body: action=register, username, password
    activate API

        API->>DB: 验证 API Key (api_keys.json)
        DB-->>API: Key 有效

        API->>DB: 速率限制检查 (rate_limit.json)
        DB-->>API: 允许访问

        Note over API: 输入校验 (格式、长度)

        API->>DB: 检查用户名唯一性 (users.json)
        DB-->>API: 用户名可用

        Note over API: 密码哈希 (bcrypt)

        API->>DB: 写入用户 (users.json, flock 排他锁)
        DB-->>API: 写入成功

        Note over API: 生成 JWT Token<br/>HMAC-SHA256 签名

    API-->>Third: 注册成功<br/>{"success":true, "token":"...", "username":"..."}
    deactivate API

    %% Token 验证流程
    Third->>API: POST /external.php<br/>Header: X-API-Key<br/>Body: action=verify, token="..."
    activate API

        Note over API: 验证 JWT 签名与过期时间

    API-->>Third: 验证结果<br/>{"success":true, "valid":true, "username":"..."}
    deactivate API
```

### 前端页面登录状态保持

```mermaid
sequenceDiagram
    autonumber
    participant Browser as 浏览器
    participant Auth as auth.php

    Note over Browser: 页面加载<br/>读取 localStorage

    alt 无 Token
        Browser->>Browser: 显示登录表单
    else 有 Token
        Browser->>Auth: POST {"action":"verify", "token":"..."}
        activate Auth
            Note over Auth: 验证 JWT 签名与过期时间
        Auth-->>Browser: {"success":true, "username":"..."}
        deactivate Auth
        Browser->>Browser: 显示已登录状态
    else Token 无效
        Browser->>Auth: POST {"action":"verify", "token":"..."}
        activate Auth
            Note over Auth: 签名无效或已过期
        Auth-->>Browser: {"success":false}
        deactivate Auth
        Browser->>Browser: 清除 localStorage 中的 Token<br/>显示登录表单
    end
```

---

## 错误处理策略

| 场景 | HTTP 状态码 | success 字段 | 设计意图 |
|------|:-----------:|:------------:|----------|
| 方法不允许 | 405 | false | 拒绝非 POST |
| API Key 无效 | 401 | false | 未授权 |
| 频率超限 | 429 | false | 限流保护 |
| JSON 格式错误 | 400 | false | 输入校验 |
| 用户名已存在 | 200 | false | 业务错误 |
| 密码错误 | 200 | false | 统一流报 |
| Token 过期 | 200 | false | 需重新登录 |
| 服务器异常 | 500 | false | 内部错误 |

> 业务层面的失败统一返回 HTTP 200 + `success:false`，只有基础设施层面的错误使用 4xx/5xx。
