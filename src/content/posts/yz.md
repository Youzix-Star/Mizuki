---
title: 配置
published: 2026-05-16
date: 2026-05-15
description: API配置
tags: [API, 幽云]
category: API
author: 洛轻羽
draft: false
---

# 幽云用户系统 API

一套完整的登录/注册认证系统，支持前端页面使用、外部站点 API 调用、管理员后台管理。

## 目录结构

```
auth-api/
├── index.html              # 前端登录/注册页面
├── admin.html              # 管理员后台（需登录）
├── API-DOCS.md             # 外部站点接入文档
├── API-FLOW.md             # API 完整流程文档（架构/数据流/认证机制）
├── README.md               # 本文件
├── example-client.php      # 外部站点集成示例
├── api/
│   ├── config.php          # 配置文件（支持 settings.json 覆盖）
│   ├── auth.php            # 前端页面 API（注册/登录/修改密码/验证）
│   ├── external.php        # 外部站点 API（需 API Key）
│   ├── room.php            # 房间管理 API（创建/加入/踢人/消息）
│   ├── admin.php           # 管理员后台 API
│   ├── db.php              # JSON 数据层（文件锁 + 自动存储 username）
│   ├── middleware.php       # 中间件（CORS、动态 API Key 验证、限流）
│   └── token.php           # Token 生成与验证
├── assets/
│   └── favicon.svg         # 网站图标
└── data/
    ├── .htaccess           # 禁止 Web 直接访问 JSON
    ├── users.json          # 用户数据（自动创建）
    ├── admin.json          # 管理员密码（自动创建）
    ├── settings.json       # 系统设置（后台修改后自动创建）
    ├── api_keys.json       # API Key 列表（后台生成后自动创建）
    ├── rate_limit.json     # 速率限制记录（自动创建）
    └── admin.log           # 管理员操作日志（自动创建）
```

## 快速部署

### 1. 部署到 PHP 环境

将整个目录放到 Web 服务器中（Apache/Nginx + PHP 7.4+）。

### 2. 登录管理后台

1. 访问 `https://api.yun52.cn/admin.html`
2. 默认管理员密码：`admin123`
3. **立即**去「系统设置」修改管理员密码

### 3. 生成 API Key

1. 进入后台「API Key」页面
2. 填写平台名称（如"官方网站"），点击「生成 Key」
3. 复制保存生成的 Key（`ak_` 开头的字符串）
4. 外部站点调用时携带此 Key

### 4. 其他设置

在后台「系统设置」中可配置：
- CORS 跨域白名单
- 速率限制
- Token 有效期
- 用户名/密码规则

## 管理员后台功能

| 页面 | 功能 |
|------|------|
| 📊 仪表盘 | 总用户、活跃用户、封禁用户、API Key 数量统计 |
| 👥 用户管理 | 搜索、分页、重置密码、封禁/解封、删除 |
| 🔑 API Key | 生成/删除/启用/禁用/重新生成平台 Key |
| ⚙️ 系统设置 | CORS 白名单、速率限制、Token 有效期、用户名密码规则、修改管理员密码 |
| 📋 操作日志 | 查看管理员所有操作记录 |

## API 接口

### 前端 API（`/api/auth.php`）

无需 API Key，前端页面直接调用。

| action | 参数 | 说明 |
|--------|------|------|
| `register` | `username`, `password`, `extra` (可选) | 注册 |
| `login` | `username`, `password`, `extra` (可选) | 登录 |
| `verify` | `token` | 验证 Token |
| `change_password` | `token`, `old_password`, `new_password` | 修改密码 |

### 房间 API（`/api/room.php`）

需要 Token 认证（支持 API Key + Token）。

| action | 参数 | 说明 |
|--------|------|------|
| `room_create` | `name`, `max_players`, `is_public`, `password`, `extra` | 创建房间 |
| `room_join` | `room_id`, `password` | 加入房间 |
| `room_leave` | `room_id` | 离开房间 |
| `room_list` | `filter`, `page`, `per_page` | 房间列表 |
| `room_info` | `room_id` | 房间详情 |
| `room_update` | `room_id`, `name`, `max_players`, ... | 修改设置（房主） |
| `room_kick` | `room_id`, `kick_username` | 踢出成员（房主） |
| `room_delete` | `room_id` | 删除房间（房主） |
| `room_message` | `room_id`, `content`, `type` | 发送房间消息 |

### 外部站点 API（`/api/external.php`）

需在请求头携带 `X-API-Key`（后台生成的平台 Key）。

| action | 参数 | 说明 |
|--------|------|------|
| `register` | `username`, `password`, `extra` (可选) | 注册 |
| `login` | `username`, `password`, `extra` (可选) | 登录 |
| `verify` | `token` | 验证 Token |
| `check` | `username` | 检查用户名是否可用 |
| `change_password` | `token`, `old_password`, `new_password` | 修改密码 |

## 安全机制

| 措施 | 说明 |
|------|------|
| 管理员认证 | 独立密码 + Token（2小时有效期）+ 前端守卫层 |
| API Key 动态管理 | 后台按平台生成独立 Key，支持启用/禁用/重新生成 |
| 密码哈希 | bcrypt (cost=12)，不可逆 |
| Token 签名 | HMAC-SHA256，防篡改 |
| 速率限制 | 每 IP 每分钟可配置次数 |
| 文件锁 | flock 并发安全读写 |
| .htaccess | 禁止 Web 直接访问 .json 文件 |
| 输入校验 | 用户名/密码长度、格式严格验证 |
| 统一错误消息 | 登录失败统一流报（防枚举） |
| CORS 白名单 | 仅允许指定域名跨域 |
| 安全响应头 | X-Content-Type-Options, X-Frame-Options, no-cache |
| 📋 操作日志 | 管理员所有操作记录可追溯 |
| IP 追踪 | 记录注册 IP、最后登录 IP、登录次数 |
| 附加信息 | 请求方可在注册/登录时传入 extra 数据（设备、来源等） |

## 外部站点集成

参考 `example-client.php`，或参阅 `API-DOCS.md` 获取完整接入文档。

```php
require_once 'example-client.php';

$result = registerUser('username', 'password');  // 注册
$result = loginUser('username', 'password');      // 登录
$result = verifyToken($token);                    // 验证 Token
$result = checkUsername('newuser');                // 检查用户名
```
