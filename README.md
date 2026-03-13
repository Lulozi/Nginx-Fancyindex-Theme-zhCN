# Nginx-Fancyindex-Theme

[中文](README.md)  |  [English](README_en.md)

为 [Nginx](https://www.nginx.org/) 的 [Fancyindex 模块](https://github.com/aperezdc/ngx-fancyindex) 提供的响应式主题（作者 @aperezdc）。

- [Nginx-Fancyindex-Theme](#nginx-fancyindex-theme)
  - [使用方法](#使用方法)
    - [FancyIndex 安装来源](#fancyindex-安装来源)
    - [Nginx 配置](#nginx-配置)
    - [RHEL 操作步骤](#rhel-操作步骤)
  - [配置选项](#配置选项)
  - [语言切换](#语言切换)
  - [JavaScript 说明](#javascript-说明)
  - [截图](#截图)

## 使用方法

1. 确保 fancyindex 包已构建或已安装
2. 在 nginx 配置中启用 fancyindex 相关指令
3. 将 `Nginx-Fancyindex/` 目录放到你在 nginx 配置中通过 `alias` 指向的位置（或站点根目录）
4. 重启或重载 nginx

### FancyIndex 安装来源

- EPEL 9 的 RPM: <https://rhel.pkgs.org/9/epel-x86_64/nginx-mod-fancyindex-0.5.2-3.el9.x86_64.rpm.html>
- 从源码构建: <https://github.com/aperezdc/ngx-fancyindex?tab=readme-ov-file#building>

### Nginx 配置

```conf
...
http {
    ...
    server {
        listen 80;
        server_name X.X.X.X;
        root /var/www/html;

        # 从 /share 提供内容
        location ^~ / {
            fancyindex on;
            fancyindex_localtime on;
            fancyindex_exact_size off;
            fancyindex_header "/.theme/header.html";
            fancyindex_footer "/.theme/footer.html";
            ...
        }
    }
}

```

### RHEL 操作步骤

```bash
# 在 Fedora 系发行版（RHEL/CentOS/Rocky）
dnf install nginx-mod-fancyindex
nano /etc/nginx/nginx.conf
mv ./Nginx-Fancyindex /var/www/html/.theme/
# 或按配置的 alias 路径放置
# restorecon -Rv /var/www/html/
nginx -s reload
# 或：systemctl restart nginx.service
```

## 配置选项

标准配置示例如下：

```bash
fancyindex on;
fancyindex_localtime on;
fancyindex_exact_size off;
fancyindex_header "/.theme/header.html";
fancyindex_footer "/.theme/footer.html";
# 被忽略的文件不会出现在目录列表中，但仍可访问
fancyindex_ignore "examplefile.html";
# 确保这些文件夹不显示在列表中
fancyindex_ignore "Nginx-Fancyindex";
```

## 语言切换

- 默认中文（未设置 `lang` cookie 时）
- `lang=zh` 使用中文主题，`lang=en` 使用英文主题
- 页面内置的语言切换按钮会写入 cookie 并刷新页面

## JavaScript 说明

- `addNginxFancyIndexForm.js` 为目录页增加搜索过滤、主题切换、分页等功能。
- `jquery.min.js` 打包了 jQuery 2.1.0，用于 DOM 查询、事件与通用工具（本主题已不再依赖）。
- `showdown.min.js` 提供 Markdown 转 HTML 的能力，用于加载可选的文档文件。

## 截图

![暗色-窄屏](screenshots/Nginx-Fancyindex-zhCN-Dark-Narrow.jpeg "暗色主题（窄屏）")

![暗色-宽屏](screenshots/Nginx-Fancyindex-zhCN-Dark-Wide.jpeg "暗色主题（宽屏）")

![亮色-窄屏](screenshots/Nginx-Fancyindex-zhCN-Light-Narrow.jpeg "亮色主题（窄屏）")

![亮色-宽屏](screenshots/Nginx-Fancyindex-zhCN-Light-Wide.jpeg "亮色主题（宽屏）")

---
