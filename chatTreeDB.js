// Структура для работы с Chrome Storage API вместо IndexedDB
class ChatTreeDB {
    constructor() {
        this.storageKey = 'chatTree';
        this.isInitialized = false;
    }

    // Инициализация (теперь просто проверка Chrome Storage API)
    async init() {
        try {
            // Проверяем доступность Chrome Storage API
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                throw new Error('Chrome Storage API not available');
            }

            this.isInitialized = true;
            console.log('ChatTreeDB initialized successfully with Chrome Storage API');
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to initialize ChatTreeDB:', error);
            throw error;
        }
    }

    // Создать новый чат
    async createChat(chatData) {
        try {
            const chat = {
                href: chatData.href,
                title: chatData.title || 'New Chat',
                parentHref: chatData.parentHref || null,
                isThread: chatData.isThread || false,
                createdAt: chatData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messageCount: chatData.messageCount || 0,
                depth: chatData.depth || 0,
                originalUrl: chatData.originalUrl || null,
                tags: chatData.tags || [],
                isArchived: false,
                customData: chatData.customData || {}
            };

            // Получаем существующие чаты
            const result = await chrome.storage.local.get([this.storageKey]);
            const existingChats = result[this.storageKey] || [];

            // Добавляем новый чат
            existingChats.push(chat);

            // Сохраняем обратно
            await chrome.storage.local.set({ [this.storageKey]: existingChats });

            console.log('Chat created in Chrome Storage:', chat);
            return chat;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    // Получить чат по href
    async getChat(href) {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            const chat = allChats.find(chat => chat.href === href);
            return chat || null;
        } catch (error) {
            console.error('Error getting chat:', error);
            throw error;
        }
    }

    // Обновить чат
    async updateChat(href, updates) {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            const chatIndex = allChats.findIndex(chat => chat.href === href);
            if (chatIndex === -1) {
                throw new Error(`Chat with href ${href} not found`);
            }

            const updatedChat = {
                ...allChats[chatIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            allChats[chatIndex] = updatedChat;

            await chrome.storage.local.set({ [this.storageKey]: allChats });

            console.log('Chat updated in Chrome Storage:', updatedChat);
            return updatedChat;
        } catch (error) {
            console.error('Error updating chat:', error);
            throw error;
        }
    }

    // Получить дочерние чаты
    async getChildChats(parentHref) {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            const childChats = allChats.filter(chat => chat.parentHref === parentHref);
            return childChats;
        } catch (error) {
            console.error('Error getting child chats:', error);
            throw error;
        }
    }

    // Построить дерево чатов
    async buildChatTree() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            console.log('Building chat tree from Chrome Storage data:', allChats);

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
            const sortByDate = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
            rootChats.sort(sortByDate);
            rootChats.forEach(root => this.sortTreeChildren(root, sortByDate));

            console.log('Built chat tree:', rootChats);
            return rootChats;
        } catch (error) {
            console.error('Error building chat tree:', error);
            throw error;
        }
    }

    // Рекурсивная сортировка дочерних элементов
    sortTreeChildren(node, sortFn) {
        if (node.children && node.children.length > 0) {
            node.children.sort(sortFn);
            node.children.forEach(child => this.sortTreeChildren(child, sortFn));
        }
    }

    // Удалить чат
    async deleteChat(href) {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            const filteredChats = allChats.filter(chat => chat.href !== href);

            await chrome.storage.local.set({ [this.storageKey]: filteredChats });

            console.log('Chat deleted from Chrome Storage:', href);
            return true;
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    }

    // Очистить все чаты
    async clearAllChats() {
        try {
            await chrome.storage.local.set({ [this.storageKey]: [] });
            console.log('All chats cleared from Chrome Storage');
            return true;
        } catch (error) {
            console.error('Error clearing all chats:', error);
            throw error;
        }
    }

    // Получить статистику использования хранилища
    async getStorageStats() {
        try {
            const usage = await chrome.storage.local.getBytesInUse([this.storageKey]);
            const result = await chrome.storage.local.get([this.storageKey]);
            const chatCount = (result[this.storageKey] || []).length;

            return {
                bytesUsed: usage,
                chatCount: chatCount,
                maxBytes: 10 * 1024 * 1024, // 10MB limit
                usagePercentage: (usage / (10 * 1024 * 1024)) * 100
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                bytesUsed: 0,
                chatCount: 0,
                maxBytes: 10 * 1024 * 1024,
                usagePercentage: 0
            };
        }
    }

    // Добавьте этот метод в класс ChatTreeDB

// Найти корневой родительский чат в дереве
    async findRootParent(chatHref) {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const allChats = result[this.storageKey] || [];

            let currentChat = allChats.find(chat => chat.href === chatHref);
            if (!currentChat) return null;

            // Поднимаемся по дереву до корневого родителя
            while (currentChat.parentHref) {
                const parentChat = allChats.find(chat => chat.href === currentChat.parentHref);
                if (!parentChat) break;
                currentChat = parentChat;
            }

            return currentChat;
        } catch (error) {
            console.error('Error finding root parent:', error);
            return null;
        }
    }

// Обновить updatedAt у корневого родителя треда
    async updateRootParentTimestamp(childChatHref) {
        try {
            const rootParent = await this.findRootParent(childChatHref);
            if (!rootParent) {
                console.log('No root parent found for:', childChatHref);
                return null;
            }

            // Обновляем только updatedAt у корневого родителя
            const updatedParent = await this.updateChat(rootParent.href, {
                updatedAt: new Date().toISOString()
            });

            console.log('Root parent timestamp updated:', rootParent.href);
            return updatedParent;
        } catch (error) {
            console.error('Error updating root parent timestamp:', error);
            return null;
        }
    }
}

// Создаем глобальный экземпляр (сохраняем совместимость)
window.chatTreeDB = new ChatTreeDB();
