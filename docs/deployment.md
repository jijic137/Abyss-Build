# 部署方案（账号 + 云端存档 + 链接点开即玩）

> 目标：游戏一个纯前端 HTML5 项目，链接点开即玩，支持玩家注册/登录，
> 一人一份独立存档、断点续玩不丢。本文给出可直接落地的推荐路线与备选方案。

## 1. 现状（已经具备，正好可复用）

还记得项目里其实已经预留了完整的持久化骨架，不需要从零造：

- `js/61_storage.js`：统一持久化层，含
  - `G.Save` / `G.Meta`：档案内存态 + 读写。
  - `G.Account`：账号接口占位（`signIn` / `signOut` / `upload` / `download` / `sync`），当前返回「未接入」。
  - `G.Storage`：三槽位自动存档（切换 / 覆盖保存 / 快照），slot 语义。
  - 导出 / 导入完整档案 JSON、版本迁移 `migrate()`、冲突合并 `mergeProfiles()`。
- 也就是说「单存档入口、覆盖保存、进度不丢、其它玩家互不干扰」的**前端数据模型和解口都已在位**，缺的是把存储后端从 localStorage 换成云端 + 账号。

## 2. 推荐路线：Supabase（免费额度够起步）

定位：**纯静态托管 + 托管 Postgres + Auth + RLS 安全**，一站式，不用自己运维服务器。

### 2.1 要建的东西

| 组件 | 用途 |
|------|------|
| Supabase 项目 | 提供 Postgres、Auth、Storage、REST/Realtime |
| Auth（邮箱+密码） | 玩家注册 / 登录，产出 JWT |
| `user_saves` 表 | 每个用户一行，存整个档案 JSON（正是 `G.Storage` 槽位快照的序列化）|
| RLS 策略 | 只允许 `auth.uid() = 本人` 读写自己那行，保证「其它玩家数据互不干扰」 |
| 前端 SDK | `@supabase/supabase-js`，接到 `G.Account` |

### 2.2 推荐表结构

```sql
create table public.user_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile     jsonb not null default '{}'::jsonb,   -- 完整档案快照
  slot        int  not null default 1,               -- 槽位 1..3
  updated_at  timestamptz not null default now(),
  unique (user_id, slot)
);
```

RLS：

```sql
alter table public.user_saves enable row level security;
create policy "本人可读写" on public.user_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 2.3 前端接入点（`G.Account` 落地）

保持现有注释契约不变，把占位实现替换为 `@supabase/supabase-js` 调用：

- `signIn({ email, password })` → `supabase.auth.signInWithPassword(...)`；成功后 `download()`。
- `signUp(...)` → 注册（默认即登录）。
- `download()` → 查 `user_saves`（当前用户、当前槽位），若有则 `mergeProfiles(本地, 云端, 'merge')` → `Save.reload()`。
- `upload()` → upsert 当前槽位档案到 `user_saves`。
- `sync()` → 登录后先 download 再 upload（合并冲突，较新者胜 / 字段级 merge，现有 `mergeProfiles` 已实现）。
- 存档按钮 / 撤离 / 死亡 / 开新局等关键节点，防抖调用 `upload()`。

这样「云为主 + 本地缓存」自然成立：线上权威副本在服务器，本地 localStorage 只做缓存加速，换设备重登即可拉回进度。

### 2.4 静态托管（链接点开即玩）

项目是纯前端静态文件，两种方式任选：

- **Supabase Storage / 任意静态托管**（Netlify / Vercel / GitHub Pages / 对象存储+CDN）：把 `index.html` + `css/` + `js/` + `assets/` 原样上传即可，无需构建。
- 前端通过 CDN 引入 `@supabase/supabase-js`，项目本身保持纯静态、零构建。

最终 URL 形如 `https://你的站点/`，玩家点开即玩；首屏注册/登录后可跨设备同步。

## 3. 备选方案

### 3.1 Vercel + 自建接口
- 前端放 Vercel 静态；后端用 Vercel Serverless Functions（Node）暴露 `/api/signin`、`/api/register`、`/api/save`、`/api/load`。
- 数据存 Vercel Postgres 或外部 Postgres。
- 适合想要完全掌控后端逻辑、又不想自己运维服务器的场景；但认证（密码哈希、JWT）要自己写，工作量明显大于 Supabase。

### 3.2 自建 Node 私有服务器
- 一台云服务器跑 Node/Express + Postgres/MySQL/SQLite + HTTPS。
- 可控性最高，但要自己处理域名、证书、备份、扩容与安全。

## 4. 推荐执行顺序

1. 注册 Supabase 项目，建表 + RLS（见 2.2）。
2. 在 `G.Account` 里接入 `@supabase/supabase-js`（登录/下载/上传/同步）。
3. 标题页加「账号」入口：注册 / 登录 / 当前用户 / 退出；本地还是在线状态清晰展示。
4. 存档页（`62_dataui`）在「单存档 + 覆盖保存」基础上，叠加"云端已同步"提示与手动同步按钮。
5. 静态托管部署，得到点开即玩的链接。
6. 验证：注册 → 玩到一半存档 → 清缓存重登仍能继续；两个账号互不可见。

## 5. 与用户诉求的对应

- 「一个存档入口、覆盖保存」：`G.Storage` 槽位 + `saveSlot` 覆盖写入已实现，云端 `upsert` 保持同样语义。
- 「下次点开进度不丢」：云端权威副本 + 登录后 `download()`。
- 「其它玩家数据不丢 / 互不干扰」：`user_saves` 每用户一行 + RLS 隔离。
- 「链接点开即玩、可注册登录」：纯静态托管 + 前端 `G.Account` 接 Supabase Auth。
