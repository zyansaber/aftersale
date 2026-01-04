# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

```shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
```


## Render.com 部署指南

本项目已经提供 `render.yaml`，可以在 Render 上一键创建静态站点：

1. 将仓库推送到自己的 Git 代码仓。
2. 在 Render 创建 **Static Site**，选择本仓库并让 Render 自动识别 `render.yaml`。
3. 在「环境变量」里配置下表中的值（全部以 `VITE_` 开头，编译时生效），可以参考 `.env.example`：

| 变量名 | 说明 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 项目 ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | 存储桶 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID |

4. Render 会自动执行 `pnpm install --frozen-lockfile && pnpm run build`，并将 `dist/` 作为发布目录。

如果想本地模拟 Render 构建，可运行：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm run preview
```

## 大数据量性能优化

- **数据缓存与单次获取**：使用 React Query 缓存 Firebase 结果，避免多页面重复请求；`loadTicketData` 采用一次性 `get` 读取以减少监听开销。
- **分页渲染**：三个表格默认分页大小 50，避免一次渲染全部行，降低首屏 DOM 压力。
- **计算缓存**：重度统计计算通过 `useMemo` 只在数据变更时运行，减少重复计算。

如果数据进一步增长，可将分页调小、在 Firebase 端增加索引/分表，或在后端增加聚合接口以减少前端计算量。
**To build**

```shell
pnpm run build
```
