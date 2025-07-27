const observer = new MutationObserver(() => insertButtonBelowLastResponse());
observer.observe(document.body, {childList: true, subtree: true});

let timeoutId = null;

function insertButtonBelowLastResponse() {
    const gptMessages = [...document.querySelectorAll('.text-base > .agent-turn')];
    if (gptMessages.length === 0) return;

    const lastMessage = gptMessages[gptMessages.length - 1];
    const container = lastMessage.closest('div');

    if (!container || container.querySelector('#save-thread-btn')) return;

    removeOldThreadButtons();

    const btn = createSaveThreadButton();

    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
        if (!container.querySelector('#save-thread-btn')) {
            container.appendChild(btn);
        }
    }, 1000)
}

/* Functions */
function createSaveThreadButton() {
    const btn = document.createElement("button");
    btn.id = "save-thread-btn";
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

    const span = document.createElement("span");
    span.textContent = "Save as Thread";

    btn.appendChild(icon);
    btn.appendChild(span);

    btn.addEventListener("click", handleSaveThreadClick);

    return btn;
}

function removeOldThreadButtons() {
    // Находим все кнопки с ID "save-thread-btn"
    const buttons = document.querySelectorAll('#save-thread-btn');

    // Удаляем каждую кнопку
    buttons.forEach((button, index) => {
        console.log(`Удаляем кнопку ${index + 1}`);
        button.remove();
    });
}


function handleSaveThreadClick() {
    const messages = collectMessages()
    // console.log('🚨 Thread button click')
    // console.log('Messages length: ', messages.length);
    if (messages.length === 0) return;

    const originalUrl = window.location.href;
    const originalTitle = document.title || "Original Thread";
    const threadTitle = `Thread ${new Date().toLocaleString()}`;

    // Сохраняем в localStorage
    localStorage.setItem("isCreateThread", "1");
    localStorage.setItem("threadMessages", JSON.stringify(messages));
    localStorage.setItem("threadOriginalUrl", originalUrl);
    localStorage.setItem("threadOriginalTitle", originalTitle);
    localStorage.setItem("threadTitle", threadTitle);

    // Кликаем на кнопку "Новый чат"
    const newChatBtn = document.querySelector('a[href="/"]');
    if (newChatBtn) {
        newChatBtn.click();
    } else {
        alert("Не удалось найти кнопку 'Новый чат'");
    }
}

function collectMessages() {
    const originalElements = document.querySelectorAll('.text-base');
    if (originalElements.length === 0) return [];

    // Создаём фрагмент-копию всех элементов
    const fragment = document.createDocumentFragment();
    const clones = [];

    originalElements.forEach(el => {
        const clone = el.cloneNode(true);
        fragment.appendChild(clone);
        clones.push(clone);
    });

    // Обрабатываем копии
    clones.forEach(el => {
        const isAssistantMessage = el.querySelector('.agent-turn') !== null;

        // Удаляем "Save as Thread" кнопки
        const saveBtn = el.querySelector('#save-thread-btn');
        if (saveBtn) saveBtn.remove();

        // Более точное удаление Tools элемента
        const toolsElements = el.querySelectorAll('*');
        toolsElements.forEach(element => {
            // Проверяем только непосредственный текст элемента, не включая дочерние
            const directText = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('');

            if (directText === 'Tools' && element.children.length === 0) {
                element.remove();
            }
        });

        // Более точное удаление технических скриптов
        const scriptElements = el.querySelectorAll('script, style');
        scriptElements.forEach(script => script.remove());

        // Удаляем элементы с техническими атрибутами
        const elementsWithTechContent = el.querySelectorAll('*');
        elementsWithTechContent.forEach(node => {
            // Проверяем только прямые текстовые узлы элемента
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
                    // Удаляем только текстовый узел, не весь элемент
                    textNode.remove();
                }
            });

            // Если элемент стал пустым после удаления текста, удаляем его
            if (node.children.length === 0 && node.textContent.trim() === '') {
                node.remove();
            }
        });

        // Добавляем заголовки
        if (!isAssistantMessage && !el.querySelector('.user-header')) {
            const userHeader = createMessageHeader('User');
            el.prepend(userHeader);
        }

        if (isAssistantMessage && !el.querySelector('.assistant-header')) {
            const assistantHeader = createMessageHeader('Assistant');
            el.prepend(assistantHeader);
        }
    });

    // Возвращаем текст из обработанных копий
    return clones.map(el => {
        const text = el.innerText || el.textContent || '';
        return text.trim();
    }).filter(text => text.length > 0); // Фильтруем пустые сообщения
}

function createMessageHeader(sender) {
    const header = document.createElement('div');
    header.textContent = sender + ' Message:\n\n';
    return header;
}

let isMessageAdded = false;

function handleNewChat() {
    if (localStorage.getItem("isCreateThread") === "1" && !window.location.pathname.startsWith('/c/')) {
        // console.log("🏓 Ping for new chat")
        // console.log("isCreateThread: ", localStorage.getItem("isCreateThread"))
        // console.log("threadMessages: ", JSON.parse(localStorage.getItem("threadMessages").length))
        // console.log("doesnt contain c: ", !window.location.pathname.startsWith('/c/'))
        // console.log("isMessageAdded: ", isMessageAdded)

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

                // Вставка текста в ProseMirror
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

            // Клик по кнопке "отправить"
            const sendBtn = document.querySelector('#composer-submit-button');

            if (!sendBtn) {

            } else {
                triggerNativeClick(sendBtn);

                const threadTitle = localStorage.getItem("threadTitle");
                const originalUrl = localStorage.getItem("threadOriginalUrl");
                const originalTitle = localStorage.getItem("threadOriginalTitle");

                localStorage.setItem("isCreateThread", "0");
                isMessageAdded = false;
                // localStorage.setItem("threadMessages", "[]");
            }

            // console.log('⚓ End Ping for new chat')
        }
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
