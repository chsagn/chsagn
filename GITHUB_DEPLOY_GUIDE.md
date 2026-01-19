# GitHub Pages 部署指南

## 当前状态 ✅

本地Git仓库已准备完毕,包含以下提交:
- ✅ feat: 打牌记账助手完整项目
- ✅ fix: 移除docs从gitignore以支持GitHub Pages部署
- ✅ build: 生产版本构建

构建产物已生成在 `docs/` 目录:
```
docs/
├── index.html
└── assets/
    ├── html2canvas.esm-CBrSDip1.js (201KB)
    ├── index-B06pGjOK.js (354KB)
    └── index-CScKdmRQ.css (205KB)
```

## 部署步骤

### 步骤1: 在GitHub创建新仓库

1. 访问 https://github.com/new
2. 填写仓库信息:
   - **Repository name**: `bookking_kit`
   - **Description**: `打牌记账助手 - 实时计分与多局管理`
   - **Public/Private**: 选择 **Public** (必须是Public才能使用GitHub Pages)
   - ⚠️ **不要勾选**以下选项:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
3. 点击 **Create repository**

### 步骤2: 关联远程仓库并推送

在命令行执行以下命令:

```bash
cd e:\bookking_kit

# 将 YOUR_USERNAME 替换为你的GitHub用户名
git remote add origin https://github.com/YOUR_USERNAME/bookking_kit.git

# 将主分支重命名为main
git branch -M main

# 推送到远程仓库
git push -u origin main
```

**示例**(假设用户名是 zhangsan):
```bash
git remote add origin https://github.com/zhangsan/bookking_kit.git
git branch -M main
git push -u origin main
```

### 步骤3: 配置GitHub Pages

1. 进入仓库页面: `https://github.com/YOUR_USERNAME/bookking_kit`
2. 点击顶部 **Settings** (设置)
3. 在左侧菜单找到 **Pages**
4. 配置如下:
   - **Source**: Deploy from a branch
   - **Branch**:
     - 分支选择: `main`
     - 文件夹选择: `/docs`
   - 点击 **Save**

### 步骤4: 等待部署完成

1. 返回 **Pages** 设置页面
2. 等待1-2分钟,页面顶部会显示:
   ```
   ✅ Your site is live at https://YOUR_USERNAME.github.io/bookking_kit/
   ```
3. 点击链接访问你的应用!

## 访问地址

部署成功后,你的应用将在以下地址可用:

```
https://YOUR_USERNAME.github.io/bookking_kit/
```

**示例**(假设用户名是 zhangsan):
```
https://zhangsan.github.io/bookking_kit/
```

## 后续更新

如果你修改了代码并想要更新线上版本:

```bash
cd e:\bookking_kit

# 1. 构建新版本
npm run build

# 2. 提交更改
git add .
git commit -m "update: 更新描述"
git push

# 3. 等待1-2分钟,GitHub Pages会自动重新部署
```

## 常见问题

### Q1: 推送时要求输入用户名密码

**方案1: 使用Personal Access Token**
1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 勾选 `repo` 权限
4. 复制生成的token
5. 推送时:
   - Username: 你的GitHub用户名
   - Password: 粘贴刚才的token

**方案2: 使用SSH**
```bash
# 使用SSH地址替换HTTPS地址
git remote set-url origin git@github.com:YOUR_USERNAME/bookking_kit.git
```

### Q2: 页面部署后显示404

**检查清单**:
1. 确认Branch选择了 `main`
2. 确认Folder选择了 `/docs`
3. 确认仓库是Public
4. 等待5分钟后再试
5. 清除浏览器缓存

### Q3: 页面样式错乱

**原因**: base路径配置问题

**解决**:
1. 检查 `vite.config.js` 中 `base: '/bookking_kit/'`
2. 确保仓库名和base路径一致
3. 重新构建: `npm run build`
4. 提交推送

### Q4: 如何绑定自定义域名?

1. 在 GitHub Pages 设置页面的 **Custom domain** 输入你的域名
2. 在域名DNS设置中添加CNAME记录指向 `YOUR_USERNAME.github.io`
3. 等待DNS生效(可能需要几小时)

## 一键部署脚本

为了简化后续更新,已创建部署脚本 `deploy.bat`:

```batch
@echo off
echo 🚀 开始构建和部署...
echo.

echo 📦 正在构建生产版本...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败!
    pause
    exit /b 1
)

echo ✅ 构建完成!
echo.

echo 📤 正在提交到Git...
git add .
git commit -m "build: 更新部署 %date% %time%"

echo 🌐 正在推送到GitHub...
git push

echo.
echo ✅ 部署完成!
echo 🎉 等待1-2分钟后访问你的网站
pause
```

使用方法:
```bash
# 双击运行或命令行执行
deploy.bat
```

## 技术支持

如有问题,请查看:
- 📖 [完整文档](README.md)
- 🚀 [快速开始](QUICKSTART.md)
- 📊 [项目报告](FINAL_REPORT.md)

---

**祝部署顺利!** 🎉
