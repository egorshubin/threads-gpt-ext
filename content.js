// Инициализируем базу данных при загрузке
let dbInitialized = false;

async function initDatabase() {
    if (!dbInitialized) {
        try {
            await chatTreeDB.init();
            dbInitialized = true;
            // console.log('ChatTreeDB initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ChatTreeDB:', error);
        }
    }
}

// Инициализируем БД сразу
initDatabase();

const observer = new MutationObserver(() => insertButtonsToAllAgentMessages());
observer.observe(document.body, {childList: true, subtree: true});

let timeoutId = null;

function insertButtonsToAllAgentMessages() {
    const gptMessages = [...document.querySelectorAll('.text-base > .agent-turn')];
    if (gptMessages.length === 0) return;

    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
        gptMessages.forEach((message, index) => {
            const container = message.closest('div');
            if (!container || container.querySelector('.save-thread-btn')) return;

            const btn = createSaveThreadButton(index);
            container.appendChild(btn);
        });
    }, 2000);
}

function createSaveThreadButton(messageIndex) {
    const btn = document.createElement("button");
    btn.className = "save-thread-btn";
    btn.setAttribute("data-message-index", messageIndex);
    btn.style.cssText = `
        margin-top: 12px;
        padding: 6px 12px 6px 10px;
        background-color: #10a37f;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        width: fit-content;
        line-height: 1em;
    `;

    const icon = createThreadsIcon();

    const span = document.createElement("span");
    span.textContent = "Save as Thread";

    btn.appendChild(icon);
    btn.appendChild(span);

    btn.addEventListener("click", () => handleSaveThreadClick(messageIndex));

    return btn;
}

function createThreadsIcon(width = 20, height = 20, mr = 6) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    icon.setAttribute("viewBox", "0 0 640 640");
    icon.setAttribute("fill", "currentColor");
    icon.style.marginRight = "6px";
    icon.style.verticalAlign = "middle";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M176 168C189.3 168 200 157.3 200 144C200 130.7 189.3 120 176 120C162.7 120 152 130.7 152 144C152 157.3 162.7 168 176 168zM256 144C256 176.8 236.3 205 208 217.3L208 288L384 288C410.5 288 432 266.5 432 240L432 217.3C403.7 205 384 176.8 384 144C384 99.8 419.8 64 464 64C508.2 64 544 99.8 544 144C544 176.8 524.3 205 496 217.3L496 240C496 301.9 445.9 352 384 352L208 352L208 422.7C236.3 435 256 463.2 256 496C256 540.2 220.2 576 176 576C131.8 576 96 540.2 96 496C96 463.2 115.7 435 144 422.7L144 217.4C115.7 205 96 176.8 96 144C96 99.8 131.8 64 176 64C220.2 64 256 99.8 256 144zM488 144C488 130.7 477.3 120 464 120C450.7 120 440 130.7 440 144C440 157.3 450.7 168 464 168C477.3 168 488 157.3 488 144zM176 520C189.3 520 200 509.3 200 496C200 482.7 189.3 472 176 472C162.7 472 152 482.7 152 496C152 509.3 162.7 520 176 520z");
    icon.appendChild(path);

    return icon;
}

async function handleSaveThreadClick(messageIndex) {
    if (!dbInitialized) {
        await initDatabase();
    }

    const messages = collectMessagesUpTo(messageIndex);
    if (messages.length === 0) return;

    const currentUrl = window.location.href;
    const currentTitle = document.title || "Original Thread";
    const threadTitle = `Thread ${new Date().toLocaleString()}`;

    // Сохраняем в localStorage для передачи данных
    localStorage.setItem("isCreateThread", "1");
    localStorage.setItem("threadMessages", JSON.stringify(messages));
    localStorage.setItem("threadParentUrl", currentUrl);
    localStorage.setItem("threadParentTitle", currentTitle);
    localStorage.setItem("threadTitle", threadTitle);

    // Также сохраняем/обновляем текущий чат в Chrome Storage через ChatTreeDB
    try {
        const existingChat = await chatTreeDB.getChat(currentUrl);
        const messageCount = document.querySelectorAll('.text-base').length;

        if (existingChat) {
            // Обновляем существующий чат
            await chatTreeDB.updateChat(currentUrl, {
                title: currentTitle,
                messageCount: messageCount,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Создаем новый чат
            await chatTreeDB.createChat({
                href: currentUrl,
                title: currentTitle,
                parentHref: null,
                isThread: false,
                messageCount: messageCount,
                createdAt: new Date().toISOString()
            });
        }

        console.log('Current chat saved/updated in Chrome Storage:', currentUrl);
    } catch (error) {
        console.error('Error saving current chat to Chrome Storage:', error);
    }

    // Кликаем на кнопку "Новый чат"
    const newChatBtn = document.querySelector('a[href="/"]');
    if (newChatBtn) {
        newChatBtn.click();
    } else {
        alert("Не удалось найти кнопку 'Новый чат'");
    }
}

// Функция для сохранения нового потока в БД
async function saveNewThreadToDB(newChatUrl, chatTitle, parentUrl) {
    if (!dbInitialized) {
        await initDatabase();
    }

    try {
        // Определяем глубину вложенности
        let depth = 0;
        const parentChat = await chatTreeDB.getChat(parentUrl);
        if (parentChat) {
            depth = parentChat.depth + 1;
        }

        // Создаем новый поток в Chrome Storage через ChatTreeDB
        await chatTreeDB.createChat({
            href: newChatUrl,
            title: chatTitle,
            parentHref: parentUrl,
            isThread: true,
            depth: depth,
            originalUrl: parentUrl,
            messageCount: 1, // Начальное сообщение с историей
            createdAt: new Date().toISOString()
        });

        console.log(`Thread saved to Chrome Storage: ${chatTitle} (${newChatUrl}) -> parent: ${parentUrl}`);
    } catch (error) {
        console.error('Error saving thread to Chrome Storage:', error);
    }
}

// Остальные функции остаются без изменений...
function collectMessagesUpTo(messageIndex) {
    const originalElements = document.querySelectorAll('.text-base');
    if (originalElements.length === 0) return [];

    const agentElements = [...document.querySelectorAll('.text-base > .agent-turn')];
    if (messageIndex >= agentElements.length) return [];

    const targetAgentElement = agentElements[messageIndex];
    const targetContainer = targetAgentElement.closest('.text-base');

    const allElements = [...originalElements];
    const cutoffIndex = allElements.indexOf(targetContainer);

    if (cutoffIndex === -1) return [];

    const elementsToProcess = allElements.slice(0, cutoffIndex + 1);

    const fragment = document.createDocumentFragment();
    const clones = [];

    elementsToProcess.forEach(el => {
        const clone = el.cloneNode(true);
        fragment.appendChild(clone);
        clones.push(clone);
    });

    clones.forEach(el => {
        const isAssistantMessage = el.querySelector('.agent-turn') !== null;

        const saveBtns = el.querySelectorAll('.save-thread-btn');
        saveBtns.forEach(btn => btn.remove());

        const toolsElements = el.querySelectorAll('*');
        toolsElements.forEach(element => {
            const directText = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('');

            if (directText === 'Tools' && element.children.length === 0) {
                element.remove();
            }
        });

        const scriptElements = el.querySelectorAll('script, style');
        scriptElements.forEach(script => script.remove());

        const elementsWithTechContent = el.querySelectorAll('*');
        elementsWithTechContent.forEach(node => {
            const directTextNodes = Array.from(node.childNodes)
                .filter(child => child.nodeType === Node.TEXT_NODE);

            directTextNodes.forEach(textNode => {
                const text = textNode.textContent.trim();
                if (
                    text.startsWith('window.__oai_logHTML') ||
                    text.startsWith('window.__oai_SSR_HTML') ||
                    text.startsWith('window.__oai_logTTI') ||
                    /^window\.__oai_\w+\(/.test(text)
                ) {
                    textNode.remove();
                }
            });

            if (node.children.length === 0 && node.textContent.trim() === '') {
                node.remove();
            }
        });

        if (!isAssistantMessage && !el.querySelector('.user-header')) {
            const userHeader = createMessageHeader('User');
            el.prepend(userHeader);
        }

        if (isAssistantMessage && !el.querySelector('.assistant-header')) {
            const assistantHeader = createMessageHeader('Assistant');
            el.prepend(assistantHeader);
        }
    });

    return clones.map(el => {
        const text = el.innerText || el.textContent || '';
        return text.trim();
    }).filter(text => text.length > 0);
}

function createMessageHeader(sender) {
    const header = document.createElement('div');
    header.textContent = sender + ' Message:\n\n';
    return header;
}

let isMessageAdded = false;

async function handleNewChat() {
    if (localStorage.getItem("isCreateThread") === "1" && !window.location.pathname.startsWith('/c/')) {
        const existingMessages = document.querySelectorAll('.text-base > .agent-turn');

        if (existingMessages.length === 0) {
            const editor = document.querySelector("#prompt-textarea");

            if (!editor) return;

            if (!isMessageAdded) {
                const threadMessages = JSON.parse(localStorage.getItem("threadMessages") || "[]");

                if (threadMessages.length === 0) {
                    localStorage.setItem("isCreateThread", "0");
                    return;
                }

                const instructions = "This is chat history. Just prepare to answer other questions";

                const text = threadMessages.join("\n\n") + "\n\n" + instructions;
                editor.focus();
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand("insertText", false, text);

                isMessageAdded = true;
            }

            const sendBtn = document.querySelector('#composer-submit-button');

            if (sendBtn) {
                triggerNativeClick(sendBtn);

                localStorage.setItem("isCreateThread", "0");
            }
        }
    }

    // Добавляем проверку на новый URL чата
    if (localStorage.getItem("isCreateThread") === "0" &&
        window.location.pathname.startsWith('/c/') &&
        isMessageAdded) {

        const newChatUrl = window.location.href;
        const chatTitle = localStorage.getItem("threadTitle");
        const parentUrl = localStorage.getItem("threadParentUrl");

        // Сохраняем новый поток в БД
        if (newChatUrl !== parentUrl) {
            await saveNewThreadToDB(newChatUrl, chatTitle, parentUrl);
        }

        isMessageAdded = false;

        showNotification('New thread created. You can see the whole tree in the extension\'s popup', 'success')
    }

}

const threadObserver = new MutationObserver(() => handleNewChat());
threadObserver.observe(document.body, {childList: true, subtree: true});

function triggerNativeClick(element) {
    const evt = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
    });
    element.dispatchEvent(evt);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');

    // Стили в зависимости от типа
    const colors = {
        success: 'rgb(16, 163, 127)',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };

    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.8);
    color: ${colors[type] || colors.success};
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    opacity: 0;
    pointer-events: none;
    transform: translateX(100%);
    transition: all 0.3s ease;
    border: 2px solid ${colors[type] || colors.success};
    font-weight: bold;
    display: flex;
    align-items: center;
  `;

    // Создаем иконку
    const icon = createThreadsIcon(80, 80, 12);
    icon.style.flexShrink = '0';

    // Создаем текст
    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    // Добавляем иконку и текст
    notification.appendChild(icon);
    notification.appendChild(textSpan);
    document.body.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Удаление через 3 секунды
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 6000);
}

