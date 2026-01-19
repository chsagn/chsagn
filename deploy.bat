@echo off
chcp 65001 >nul
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
if errorlevel 1 (
    echo ℹ️  没有需要提交的更改
) else (
    echo ✅ 提交完成!
)

echo.
echo 🌐 正在推送到GitHub...
git push
if errorlevel 1 (
    echo ❌ 推送失败! 请检查远程仓库配置
    pause
    exit /b 1
)

echo.
echo ✅ 部署完成!
echo 🎉 等待1-2分钟后访问你的网站
echo.
pause
