
class ChatTreePopup {
    constructor() {
        this.chatTreeDB = null;
        this.expandedNodes = new Set();

        // SVG иконки для expand/collapse
        this.expandedSvg = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
        `;

        this.collapsedSvg = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
        `;

        this.leafSvg = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3"/>
            </svg>
        `;

        this.init();
    }

    async init() {
        try {
            console.log('Initializing ChatTreePopup...');

            // Инициализируем базу данных (теперь Chrome Storage)
            this.chatTreeDB = new ChatTreeDB();
            await this.chatTreeDB.init();

            this.setupUI();
            await this.loadChatTree();

            console.log('ChatTreePopup initialized successfully');
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to load chat data: ' + error.message);
        }
    }

    setupUI() {
        const container = document.getElementById('thread-list');

        // Создаем контейнер для кнопок управления
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'tree-controls';
        controlsContainer.innerHTML = `
        <div class="left-controls">
            <button id="clear-all" class="control-btn clear-all-btn" title="Clear All Chats">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        </div>
        <div class="right-controls">
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
        </div>
    `;

        // Создаем контейнер для дерева
        const treeContainer = document.createElement('div');
        treeContainer.id = 'chat-tree';
        treeContainer.className = 'chat-tree';

        container.appendChild(controlsContainer);
        container.appendChild(treeContainer);

        // Добавляем обработчики событий для кнопок
        document.getElementById('clear-all').addEventListener('click', () => this.clearAllChats());
        document.getElementById('expand-all').addEventListener('click', () => this.expandAll());
        document.getElementById('collapse-all').addEventListener('click', () => this.collapseAll());
        document.getElementById('refresh').addEventListener('click', () => this.loadChatTree());
    }

    async clearAllChats() {
        const confirmed = confirm('Are you sure you want to delete ALL saved chats and threads?\n\nThis action cannot be undone.');
        if (!confirmed) return;

        try {
            await this.chatTreeDB.clearAllChats();
            await this.loadChatTree(); // Перезагружаем дерево
        } catch (error) {
            alert('Error clearing chats: ' + error.message);
        }
    }

    async loadChatTree() {
        try {
            console.log('Loading chat tree...');

            if (!this.chatTreeDB) {
                console.error('ChatTreeDB is not initialized');
                this.showError('Database not initialized');
                return;
            }

            // Читаем дерево чатов из Chrome Storage через ChatTreeDB
            const chatTree = await this.chatTreeDB.buildChatTree();
            console.log('Loaded chat tree:', chatTree);

            this.renderChatTree(chatTree);
            console.log('Chat tree rendered successfully');
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

        setTimeout(() => {
            this.expandLatestParent();
        }, 150); // Небольшая задержка для завершения DOM операций
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
            const isExpanded = this.expandedNodes.has(node.href);
            expandButton.innerHTML = isExpanded ? this.expandedSvg : this.collapsedSvg;

            expandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(node.href);
            });
        } else {
            expandButton.innerHTML = this.leafSvg;
            expandButton.disabled = true;
        }

        const nodeTitle = document.createElement('a');
        nodeTitle.className = 'node-title';
        nodeTitle.href = node.href;
        nodeTitle.textContent = this.truncateTitle(node.title);
        nodeTitle.title = node.title;
        nodeTitle.addEventListener('click', (e) => {
            e.preventDefault();

            if (e.ctrlKey || e.metaKey || e.button === 1) {
                // Новая вкладка при Ctrl+клик или средней кнопке мыши
                chrome.tabs.create({ url: node.href });
            } else {
                // Текущая вкладка при обычном клике
                chrome.tabs.update({ url: node.href });
            }

            window.close()
        });

        // Создаем контейнер для кнопок действий
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'node-actions';

        // Кнопка переименования
        const renameBtn = document.createElement('button');
        renameBtn.className = 'action-btn rename-btn';
        renameBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41L18.37 3.29a.996.996 0 00-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
        </svg>
    `;
        renameBtn.title = 'Rename';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.renameChat(node.href, node.title);
        });

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
    `;
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteChat(node.href, node.title);
        });

        actionsContainer.appendChild(renameBtn);
        actionsContainer.appendChild(deleteBtn);

        nodeContent.appendChild(expandButton);
        nodeContent.appendChild(nodeTitle);
        nodeContent.appendChild(actionsContainer);

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
                expandBtn.innerHTML = isExpanded ? this.expandedSvg : this.collapsedSvg;
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
                expandBtn.innerHTML = this.expandedSvg;
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
                expandBtn.innerHTML = this.collapsedSvg;
                childrenContainer.style.display = 'none';
            }
        });
    }

    truncateTitle(title, maxLength = 40) {
        if (!title) return 'Untitled Chat';
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    showError(message) {
        const container = document.getElementById('thread-list');
        container.innerHTML = `<div class="error">${message}</div>`;
    }

    // Функция для раскрытия элемента и всех его дочерних элементов рекурсивно
    expandNodeRecursively(nodeElement) {
        const href = nodeElement.getAttribute('data-href');
        const childrenContainer = nodeElement.querySelector('.tree-children');
        const expandBtn = nodeElement.querySelector('.expand-btn');

        if (childrenContainer && expandBtn) {
            // Добавляем в набор раскрытых узлов
            this.expandedNodes.add(href);

            // Устанавливаем иконку раскрытого состояния
            expandBtn.innerHTML = this.expandedSvg;

            // Показываем дочерние элементы
            childrenContainer.style.display = 'block';

            // Рекурсивно раскрываем всех дочерних элементов
            const childNodes = childrenContainer.querySelectorAll(':scope > .tree-node');
            childNodes.forEach(child => {
                this.expandNodeRecursively(child);
            });
        }
    }

// Функция для поиска и раскрытия последнего по дате родительского элемента
    expandLatestParent() {
        const treeRoot = document.querySelector('.tree-root');
        if (!treeRoot) return;

        // Находим все родительские элементы (элементы первого уровня)
        const rootNodes = treeRoot.querySelectorAll(':scope > .tree-node');

        if (rootNodes.length > 0) {
            // Первый элемент в списке уже отсортирован по дате (последний по времени)
            const latestParent = rootNodes[0];
            this.expandNodeRecursively(latestParent);
        }
    }

    async renameChat(href, currentTitle) {
        const newTitle = prompt('Enter new title:', currentTitle);
        if (newTitle === null || newTitle.trim() === '') return;

        try {
            await this.chatTreeDB.renameChat(href, newTitle);
            await this.loadChatTree(); // Перезагружаем дерево
        } catch (error) {
            alert('Error renaming chat: ' + error.message);
        }
    }

    async deleteChat(href, title) {
        const confirmed = confirm(`Are you sure you want to delete "${title}"?\n\nThis will also delete all child threads.`);
        if (!confirmed) return;

        try {
            const deletedHrefs = await this.chatTreeDB.deleteChatWithChildren(href);
            console.log(`Deleted ${deletedHrefs.length} chats`);
            await this.loadChatTree(); // Перезагружаем дерево
        } catch (error) {
            alert('Error deleting chat: ' + error.message);
        }
    }

}

// Инициализируем popup при каждом открытии
document.addEventListener('DOMContentLoaded', () => {
    new ChatTreePopup();
});
