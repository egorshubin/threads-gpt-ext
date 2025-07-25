function insertButtonBelowLastResponse() {
    const gptMessages = [...document.querySelectorAll('.text-base > .agent-turn')];
    if (gptMessages.length === 0) return;

    const lastMessage = gptMessages[gptMessages.length - 1];
    const container = lastMessage.closest('div');

    if (!container || container.querySelector('#save-thread-btn')) return;

    const btn = createSaveThreadButton();
    container.appendChild(btn);
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (
                node.nodeType === 1 &&
                node.matches('div.flex.justify-between')
            ) {
                insertButtonBelowLastResponse();
                return;
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

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
        line-height: 1.1em;
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

    btn.addEventListener("click", () => {
        const messages = [...document.querySelectorAll(".text-base")].map(el => el.innerText);
        const threadName = prompt("Enter a name for this thread:", "Untitled Thread");
        if (!threadName) return;

        chrome.storage.local.get({ threads: [] }, (res) => {
            res.threads.push({ name: threadName, messages, timestamp: Date.now() });
            chrome.storage.local.set({ threads: res.threads });
            alert("Thread saved!");
        });
    });

    return btn;
}

