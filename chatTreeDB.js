// Структура базы данных IndexedDB для дерева чатов
class ChatTreeDB {
    constructor() {
        this.dbName = 'ChatTreeDB';
        this.version = 1;
        this.db = null;
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Создаем основную таблицу для чатов
                if (!db.objectStoreNames.contains('chats')) {
                    const chatStore = db.createObjectStore('chats', { keyPath: 'href' });

                    // Индексы для быстрого поиска
                    chatStore.createIndex('parentHref', 'parentHref', { unique: false });
                    chatStore.createIndex('title', 'title', { unique: false });
                    chatStore.createIndex('createdAt', 'createdAt', { unique: false });
                    chatStore.createIndex('isThread', 'isThread', { unique: false });
                }

                // Таблица для метаданных
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    // Создать новый чат
    async createChat(chatData) {
        const transaction = this.db.transaction(['chats'], 'readwrite');
        const store = transaction.objectStore('chats');

        const chat = {
            href: chatData.href,
            title: chatData.title || 'New Chat',
            parentHref: chatData.parentHref || null,
            isThread: chatData.isThread || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: chatData.messageCount || 0,
            depth: chatData.depth || 0,
            originalUrl: chatData.originalUrl || null,
            tags: chatData.tags || [],
            isArchived: false,
            customData: chatData.customData || {}
        };

        return new Promise((resolve, reject) => {
            const request = store.add(chat);
            request.onsuccess = () => resolve(chat);
            request.onerror = () => reject(request.error);
        });
    }

    // Получить чат по href
    async getChat(href) {
        const transaction = this.db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');

        return new Promise((resolve, reject) => {
            const request = store.get(href);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Обновить чат
    async updateChat(href, updates) {
        const chat = await this.getChat(href);
        if (!chat) {
            throw new Error(`Chat with href ${href} not found`);
        }

        const updatedChat = {
            ...chat,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        const transaction = this.db.transaction(['chats'], 'readwrite');
        const store = transaction.objectStore('chats');

        return new Promise((resolve, reject) => {
            const request = store.put(updatedChat);
            request.onsuccess = () => resolve(updatedChat);
            request.onerror = () => reject(request.error);
        });
    }

    // Получить дочерние чаты
    async getChildChats(parentHref) {
        const transaction = this.db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');
        const index = store.index('parentHref');

        return new Promise((resolve, reject) => {
            const request = index.getAll(parentHref);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Построить дерево чатов
    async buildChatTree() {
        const transaction = this.db.transaction(['chats'], 'readonly');
        const store = transaction.objectStore('chats');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const allChats = request.result;
                const chatMap = new Map();
                const rootChats = [];

                // Создаем карту всех чатов
                allChats.forEach(chat => {
                    chatMap.set(chat.href, { ...chat, children: [] });
                });

                // Строим дерево
                allChats.forEach(chat => {
                    const chatNode = chatMap.get(chat.href);

                    if (chat.parentHref && chatMap.has(chat.parentHref)) {
                        const parent = chatMap.get(chat.parentHref);
                        parent.children.push(chatNode);
                    } else {
                        rootChats.push(chatNode);
                    }
                });

                // Сортируем по дате создания
                const sortByDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
                rootChats.sort(sortByDate);
                rootChats.forEach(root => this.sortTreeChildren(root, sortByDate));

                resolve(rootChats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Рекурсивная сортировка дочерних элементов
    sortTreeChildren(node, sortFn) {
        if (node.children && node.children.length > 0) {
            node.children.sort(sortFn);
            node.children.forEach(child => this.sortTreeChildren(child, sortFn));
        }
    }
}

// Создаем глобальный экземпляр
window.chatTreeDB = new ChatTreeDB();
