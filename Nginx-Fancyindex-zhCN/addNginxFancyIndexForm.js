// addNginxFancyIndexForm.js
// 为 Nginx FancyIndex 页面增强功能：搜索、主题切换、排序、分页等
// 针对现代浏览器优化：Chrome, Firefox, Safari, Edge
// © 2017, Lilian Besson (Naereen) 及贡献者，
// 基于 MIT 许可证开源，https://lbesson.mit-license.org/
// 托管于 GitHub，https://GitHub.com/Naereen/Nginx-Fancyindex-Theme

(function () {
    'use strict';

    const I18N = {
        lang: 'zh',
        directoryLabel: '目录',
        directoryPrefix: '目录：',
        rootLabel: '根目录',
        breadcrumbLabel: '面包屑导航',
        paginationLabel: '分页导航',
        copyUrlLabel: '复制链接',
        copyUrlTitle: '复制当前页面地址',
        copiedLabel: '已复制！',
        copyFailedLabel: '复制失败',
        themeLabels: { auto: '自动', light: '亮色', dark: '暗色' },
        themeAriaLabel: '切换主题',
        searchPlaceholder: '输入关键词搜索...',
        searchAriaLabel: '搜索目录',
        paginationPrev: '← 上一页',
        paginationNext: '下一页 →',
        paginationInfo: (start, end, total) => `显示 ${start}-${end} 条，共 ${total} 条`,
        tableHeaders: ['名称', '大小', '修改时间', '描述']
    };

    const THEME_STORAGE_KEY = 'fancyindex-theme';
    const ITEMS_PER_PAGE = 100;
    const LANG_COOKIE_NAME = 'lang';

    function normalizeLang(value) {
        const lower = (value || '').toLowerCase();
        if (lower.startsWith('zh')) return 'zh';
        if (lower.startsWith('en')) return 'en';
        return I18N.lang;
    }

    function getCookieValue(name) {
        const cookie = document.cookie
            .split('; ')
            .find((item) => item.startsWith(`${name}=`));
        return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
    }

    function setCookie(name, value) {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
    }

    const activeLang = normalizeLang(getCookieValue(LANG_COOKIE_NAME));
    const nextLang = activeLang === 'zh' ? 'en' : 'zh';

    // 注册 Service Worker 以支持离线访问
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/.theme/sw.js').catch((err) => {
            console.warn('Service worker 注册失败：', err);
        });
    }

    const form = document.createElement('form');
    const input = document.createElement('input');
    const heading = document.querySelector('h1');
    const controls = document.createElement('div');
    const themeToggle = document.createElement('button');
    const langToggle = document.createElement('button');
    const body = document.body;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const table = document.querySelector('#list');
    const tbody = table?.querySelector('tbody');

    function getPathText() {
        if (!heading) return '';
        const raw = heading.textContent.replace(I18N.directoryPrefix, '').trim();
        if (raw) return raw;
        return decodeURIComponent(window.location.pathname || '/');
    }

    // 从 h1 创建面包屑导航
    function createBreadcrumbs() {
        if (!heading) return;

        const pathText = getPathText();
        if (!pathText || pathText === '/') return;

        const breadcrumbNav = document.createElement('nav');
        breadcrumbNav.className = 'breadcrumb-nav';
        breadcrumbNav.setAttribute('aria-label', I18N.breadcrumbLabel);

        const parts = pathText.split('/').filter((part) => part);
        let currentPath = '';

        const breadcrumbList = document.createElement('ol');
        breadcrumbList.className = 'breadcrumb';

        // 添加根目录
        const rootLi = document.createElement('li');
        const rootLink = document.createElement('a');
        rootLink.href = '/';
        rootLink.textContent = I18N.rootLabel;
        rootLi.appendChild(rootLink);
        breadcrumbList.appendChild(rootLi);

        // 添加各路径段
        parts.forEach((part, index) => {
            currentPath += '/' + part;
            const li = document.createElement('li');

            if (index === parts.length - 1) {
                // 最后一项——当前目录
                li.textContent = decodeURIComponent(part);
                li.setAttribute('aria-current', 'page');
                li.className = 'breadcrumb-current';
            } else {
                const link = document.createElement('a');
                link.href = currentPath + '/';
                link.textContent = decodeURIComponent(part);
                li.appendChild(link);
            }

            breadcrumbList.appendChild(li);
        });

        breadcrumbNav.appendChild(breadcrumbList);

        // 添加复制 URL 按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-page-url-btn';
        copyBtn.textContent = I18N.copyUrlLabel;
        copyBtn.title = I18N.copyUrlTitle;
        copyBtn.setAttribute('aria-label', I18N.copyUrlTitle);
        copyBtn.type = 'button';

        copyBtn.addEventListener('click', async () => {
            const url = window.location.href;
            try {
                const originalText = copyBtn.textContent;
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(url);
                } else {
                    // 兼容方案：使用 textarea
                    const textarea = document.createElement('textarea');
                    textarea.value = url;
                    document.body.appendChild(textarea);
                    textarea.select();
                    textarea.setSelectionRange(0, 99999); // 适配移动设备
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                copyBtn.textContent = I18N.copiedLabel;
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error(err);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = I18N.copyFailedLabel;
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        });

        breadcrumbNav.appendChild(copyBtn);
        heading.textContent = I18N.directoryLabel;
        heading.after(breadcrumbNav);
    }

    createBreadcrumbs();

    controls.className = 'directory-controls';

    // 主题切换按钮（自动/亮色/暗色）
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', I18N.themeAriaLabel);

    const themeOptions = ['auto', 'light', 'dark'];
    let currentThemeIndex = 0;

    function updateThemeButton() {
        const theme = themeOptions[currentThemeIndex];
        themeToggle.textContent = I18N.themeLabels[theme];
        themeToggle.setAttribute('data-theme', theme);
    }

    themeToggle.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % 3;
        const theme = themeOptions[currentThemeIndex];
        storeTheme(theme);
        applyTheme(theme);
        updateThemeButton();
    });

    // 语言切换按钮
    langToggle.type = 'button';
    langToggle.className = 'theme-toggle lang-toggle';
    langToggle.textContent = activeLang === 'zh' ? 'English' : '中文';
    langToggle.setAttribute('aria-label', activeLang === 'zh' ? '切换到英文' : 'Switch to Chinese');
    langToggle.addEventListener('click', () => {
        setCookie(LANG_COOKIE_NAME, nextLang);
        location.reload();
    });

    controls.appendChild(themeToggle);
    controls.appendChild(langToggle);

    // 搜索输入框
    input.name = 'filter';
    input.id = 'search';
    input.type = 'search';
    input.placeholder = I18N.searchPlaceholder;
    input.setAttribute('aria-label', I18N.searchAriaLabel);
    form.appendChild(input);
    controls.appendChild(form);

    if (heading?.parentNode) {
        heading.after(controls);
    } else {
        document.body.insertBefore(controls, document.body.firstChild);
    }

    const listItems = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    let filteredItems = [...listItems];
    let currentPage = 1;

    function applyTableLabels() {
        const headers = table?.querySelectorAll('thead th') || [];
        headers.forEach((th, index) => {
            if (I18N.tableHeaders[index]) {
                th.textContent = I18N.tableHeaders[index];
            }
        });

        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (I18N.tableHeaders[index]) {
                    cell.setAttribute('data-label', I18N.tableHeaders[index]);
                }
            });
        });
    }

    applyTableLabels();

    // 创建分页控件
    function createPagination() {
        const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        paginationDiv.setAttribute('role', 'navigation');
        paginationDiv.setAttribute('aria-label', I18N.paginationLabel);

        const info = document.createElement('span');
        info.className = 'pagination-info';
        const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length);
        info.textContent = I18N.paginationInfo(start, end, filteredItems.length);
        paginationDiv.appendChild(info);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'pagination-buttons';

        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.textContent = I18N.paginationPrev;
        prevBtn.className = 'pagination-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
        buttonsDiv.appendChild(prevBtn);

        // 页码按钮（显示当前页及附近页）
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            const firstBtn = createPageButton(1);
            buttonsDiv.appendChild(firstBtn);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                buttonsDiv.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttonsDiv.appendChild(createPageButton(i));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                buttonsDiv.appendChild(ellipsis);
            }
            const lastBtn = createPageButton(totalPages);
            buttonsDiv.appendChild(lastBtn);
        }

        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.textContent = I18N.paginationNext;
        nextBtn.className = 'pagination-btn';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
        buttonsDiv.appendChild(nextBtn);

        paginationDiv.appendChild(buttonsDiv);
        return paginationDiv;
    }

    function createPageButton(pageNum) {
        const btn = document.createElement('button');
        btn.textContent = pageNum;
        btn.className = 'pagination-btn';
        if (pageNum === currentPage) {
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'page');
        }
        btn.addEventListener('click', () => {
            currentPage = pageNum;
            renderPage();
        });
        return btn;
    }

    function renderPage() {
        if (!tbody) return;

        // 隐藏所有条目
        listItems.forEach(item => item.style.display = 'none');

        // 显示当前页条目
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = filteredItems.slice(start, end);

        pageItems.forEach(item => {
            if (!item.hidden) {
                item.style.display = '';
            }
        });

        // 更新分页控件
        const existingPagination = table?.parentNode.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }

        if (filteredItems.length > ITEMS_PER_PAGE) {
            const pagination = createPagination();
            if (pagination && table) {
                table.after(pagination);
            }
        }

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 防抖搜索
    let searchTimeout;
    input.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchValue = this.value.trim();

            if (!searchValue) {
                filteredItems = [...listItems];
                listItems.forEach(item => item.hidden = false);
                currentPage = 1;
                renderPage();
                return;
            }

            const expression = "(^|.*[^\\p{L}])" +
                searchValue.split(/\s+/).join("([^\\p{L}]|[^\\p{L}].*[^\\p{L}])") +
                ".*$";
            const matcher = new RegExp(expression, 'iu');

            filteredItems = listItems.filter(item => {
                const text = item.querySelector('td')?.textContent.replace(/\s+/g, ' ') || '';
                const matches = matcher.test(text);
                item.hidden = !matches;
                return matches;
            });

            currentPage = 1;
            renderPage();
        }, 150);
    }, { passive: true });

    // 主题管理
    function getStoredTheme() {
        try {
            return localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
        } catch (error) {
            return 'auto';
        }
    }

    function storeTheme(theme) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            // 存储不可用
        }
    }

    function applyTheme(theme) {
        let actualTheme;

        if (theme === 'auto') {
            actualTheme = mediaQuery.matches ? 'dark' : 'light';
            // 监听系统主题变化
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else {
            actualTheme = theme;
            // 手动设置时移除监听
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        }

        body.classList.remove('theme-light', 'theme-dark');
        body.classList.add(`theme-${actualTheme}`);
    }

    function handleSystemThemeChange() {
        const storedTheme = getStoredTheme();
        if (storedTheme === 'auto') {
            applyTheme('auto');
        }
    }

    // 初始化主题
    const storedTheme = getStoredTheme();
    currentThemeIndex = themeOptions.indexOf(storedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 0;
    applyTheme(storedTheme);
    updateThemeButton();

    // 键盘快捷键
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement &&
            (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable);

        // '/' 或 'Ctrl+F' - 聚焦搜索框
        if ((event.key === '/' || (event.ctrlKey && event.key === 'f')) && !isTyping) {
            event.preventDefault();
            input.focus();
            input.select();
            return;
        }

        // 'Escape' - 清空搜索（当搜索框聚焦时）
        if (event.key === 'Escape' && activeElement === input) {
            event.preventDefault();
            input.value = '';
            input.dispatchEvent(new Event('input'));
            input.blur();
            return;
        }

        // 't' - 切换主题（不在输入时）
        if (event.key === 't' && !isTyping) {
            event.preventDefault();
            themeToggle.click();
            return;
        }
    });

    // 初始渲染
    renderPage();
}());
