class ChatTreePopup {
    constructor() {
        this.chatTreeDB = null;
        this.expandedNodes = new Set();
        this.init();
    }

    async init() {
        try {
            // Инициализируем базу данных
            this.chatTreeDB = new ChatTreeDB();
            await this.chatTreeDB.init();

            this.setupUI();

            // Загружаем дерево чатов из базы данных
            await this.loadChatTree();
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to load chat data');
        }
    }

    setupUI() {
        const container = document.getElementById('thread-list');

        // Создаем контейнер для кнопок управления
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'tree-controls';
        controlsContainer.innerHTML = `
            <button id="expand-all" class="control-btn" title="Expand All">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zM12 18.17L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/>
                </svg>
            </button>
            <button id="collapse-all" class="control-btn" title="Collapse All">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z"/>
                </svg>
            </button>
            <button id="refresh" class="control-btn" title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
            </button>
        `;

        // Создаем контейнер для дерева
        const treeContainer = document.createElement('div');
        treeContainer.id = 'chat-tree';
        treeContainer.className = 'chat-tree';

        container.appendChild(controlsContainer);
        container.appendChild(treeContainer);

        // Добавляем обработчики событий для кнопок
        document.getElementById('expand-all').addEventListener('click', () => this.expandAll());
        document.getElementById('collapse-all').addEventListener('click', () => this.collapseAll());
        document.getElementById('refresh').addEventListener('click', () => this.loadChatTree());
    }

    async loadChatTree() {
        try {
            // Просто читаем из базы данных и строим дерево
            const chatTree = await this.chatTreeDB.buildChatTree();
            console.log('Loaded chat tree from DB:', chatTree);
            this.renderChatTree(chatTree);
        } catch (error) {
            console.error('Error loading chat tree:', error);
            this.showError('Error loading chats: ' + error.message);
        }
    }

    renderChatTree(chatNodes) {
        const treeContainer = document.getElementById('chat-tree');
        treeContainer.innerHTML = '';

        if (chatNodes.length === 0) {
            treeContainer.innerHTML = `
                <div class="no-chats">
                    <p>No saved chats found</p>
                    <small>Use "Save as Thread" button on ChatGPT to create threads</small>
                </div>
            `;
            return;
        }

        const treeList = document.createElement('ul');
        treeList.className = 'tree-root';

        chatNodes.forEach(node => {
            const listItem = this.createTreeNode(node, 0);
            treeList.appendChild(listItem);
        });

        treeContainer.appendChild(treeList);
    }

    createTreeNode(node, depth) {
        const listItem = document.createElement('li');
        listItem.className = 'tree-node';
        listItem.setAttribute('data-href', node.href);

        const nodeContent = document.createElement('div');
        nodeContent.className = 'node-content';
        nodeContent.style.paddingLeft = `${depth * 20}px`;

        // Создаем элементы узла
        const expandButton = document.createElement('button');
        expandButton.className = 'expand-btn';

        const hasChildren = node.children && node.children.length > 0;
        if (hasChildren) {
            expandButton.innerHTML = this.expandedNodes.has(node.href) ? '▼' : '▶';
            expandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(node.href);
            });
        } else {
            expandButton.innerHTML = '•';
            expandButton.disabled = true;
        }

        const nodeIcon = document.createElement('span');
        nodeIcon.className = 'node-icon';

        // Заменяем эмодзи на SVG иконки
        if (node.isThread) {
            nodeIcon.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                    <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                </svg>
            `;
        } else {
            nodeIcon.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/>
                    <path d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z"/>
                </svg>
            `;
        }

        const nodeTitle = document.createElement('a');
        nodeTitle.className = 'node-title';
        nodeTitle.href = node.href;
        nodeTitle.textContent = this.truncateTitle(node.title);
        nodeTitle.title = node.title;
        nodeTitle.addEventListener('click', (e) => {
            e.preventDefault();
            this.openChat(node.href);
        });

        const nodeInfo = document.createElement('span');
        nodeInfo.className = 'node-info';
        nodeInfo.textContent = `(${node.messageCount || 0})`;

        nodeContent.appendChild(expandButton);
        nodeContent.appendChild(nodeIcon);
        nodeContent.appendChild(nodeTitle);
        nodeContent.appendChild(nodeInfo);

        listItem.appendChild(nodeContent);

        // Добавляем дочерние элементы
        if (hasChildren) {
            const childrenContainer = document.createElement('ul');
            childrenContainer.className = 'tree-children';
            childrenContainer.style.display = this.expandedNodes.has(node.href) ? 'block' : 'none';

            node.children.forEach(child => {
                const childNode = this.createTreeNode(child, depth + 1);
                childrenContainer.appendChild(childNode);
            });

            listItem.appendChild(childrenContainer);
        }

        return listItem;
    }

    toggleNode(nodeHref) {
        if (this.expandedNodes.has(nodeHref)) {
            this.expandedNodes.delete(nodeHref);
        } else {
            this.expandedNodes.add(nodeHref);
        }

        const nodeElement = document.querySelector(`[data-href="${CSS.escape(nodeHref)}"]`);
        if (nodeElement) {
            const expandBtn = nodeElement.querySelector('.expand-btn');
            const childrenContainer = nodeElement.querySelector('.tree-children');

            if (childrenContainer) {
                const isExpanded = this.expandedNodes.has(nodeHref);
                expandBtn.innerHTML = isExpanded ? '▼' : '▶';
                childrenContainer.style.display = isExpanded ? 'block' : 'none';
            }
        }
    }

    expandAll() {
        document.querySelectorAll('.tree-node').forEach(node => {
            const href = node.getAttribute('data-href');
            const childrenContainer = node.querySelector('.tree-children');

            if (childrenContainer) {
                this.expandedNodes.add(href);
                const expandBtn = node.querySelector('.expand-btn');
                expandBtn.innerHTML = '▼';
                childrenContainer.style.display = 'block';
            }
        });
    }

    collapseAll() {
        this.expandedNodes.clear();
        document.querySelectorAll('.tree-node').forEach(node => {
            const childrenContainer = node.querySelector('.tree-children');

            if (childrenContainer) {
                const expandBtn = node.querySelector('.expand-btn');
                expandBtn.innerHTML = '▶';
                childrenContainer.style.display = 'none';
            }
        });
    }

    truncateTitle(title, maxLength = 40) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    openChat(href) {
        chrome.tabs.create({ url: href });
        window.close();
    }

    showError(message) {
        const container = document.getElementById('thread-list');
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Инициализируем popup при каждом открытии
document.addEventListener('DOMContentLoaded', () => {
    new ChatTreePopup();
});
