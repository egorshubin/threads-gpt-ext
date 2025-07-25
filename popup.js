chrome.storage.local.get({ threads: [] }, (res) => {
    const list = document.getElementById("thread-list");
    res.threads.forEach((t, i) => {
        const div = document.createElement("div");
        div.className = "thread";
        div.innerText = `${t.name} (${new Date(t.timestamp).toLocaleString()})`;
        div.onclick = () => {
            chrome.tabs.create({ url: "https://chatgpt.com/" }, (tab) => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (messages) => {
                        setTimeout(() => {
                            const textarea = document.querySelector("textarea");
                            if (textarea) textarea.value = messages.join("\n\n");
                            textarea.dispatchEvent(new Event("input", { bubbles: true }));
                        }, 3000);
                    },
                    args: [t.messages]
                });
            });
        };
        list.appendChild(div);
    });
});
