const editor = document.getElementById("editor");
const slashMenu = document.getElementById("slashMenu");

let activeSlashBlock = null;

let documentModel = {
    order: [],
    blocks: {}
};

// Generate unique block ID

function createId() {
    return "block-" + Math.random().toString(36).slice(2, 9);
}

// Create new block

function createBlock(type, afterId = null) {

    const id = createId();

    const block = {
        id: id,
        type: type,
        data: {
            text: "" // stores HTML // CHANGE
        }
    };

    documentModel.blocks[id] = block;

    if (afterId) {

        const index = documentModel.order.indexOf(afterId);
        documentModel.order.splice(index + 1, 0, id);

    } else {

        documentModel.order.push(id);

    }

    renderDocument(id);
}

// Render entire document

function renderDocument(focusId = null) {

    let currentList = null;

    documentModel.order.forEach(id => {

        const block = documentModel.blocks[id];

        let element;

    if (block.type === "heading") {

        currentList = null;

        element = document.createElement("h2");
        editor.appendChild(element);

    }

    // PARAGRAPH
    else if (block.type === "paragraph") {

        currentList = null;

        element = document.createElement("p");
        editor.appendChild(element);

    }

    // BULLET LIST
    else if (block.type === "bullet") {

        if (!currentList || currentList.tagName !== "UL") {

            currentList = document.createElement("ul");
            editor.appendChild(currentList);

        }

        element = document.createElement("li");
        currentList.appendChild(element);

    }

    // NUMBERED LIST
    else if (block.type === "numbered") {

        if (!currentList || currentList.tagName !== "OL") {

            currentList = document.createElement("ol");
            editor.appendChild(currentList);

        }

        element = document.createElement("li");
        currentList.appendChild(element);

    }



        element.classList.add("block");
        element.dataset.id = block.id;
        element.contentEditable = true;

        element.innerHTML = block.data.text; // FIX: preserve formatting

        // Caret placement
        if (focusId === id) {

            setTimeout(() => {

                element.focus();

                const range = document.createRange();
                const selection = window.getSelection();

                range.selectNodeContents(element); // CHANGE
                range.collapse(false); // CHANGE: cursor at end

                selection.removeAllRanges();
                selection.addRange(range);

            }, 0);

        }

        // Keydown handler
        element.addEventListener("keydown", (e) => {

            const selection = window.getSelection();

            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);

            const cursorPos = range.startOffset;
            const textLength = element.innerText.length;

            // ENTER → create new block
            if (e.key === "Enter") {

                e.preventDefault();

                block.data.text = element.innerHTML; // FIX: store formatted HTML
                
                // List Blocks
            if (block.type === "bullet" ||  block.type === "numbered") {

                createBlock(block.type, block.id);
 
            } else {

                createBlock("paragraph", block.id);

            }

                saveDocument();

            }

            // BACKSPACE → merge blocks
            if (e.key === "Backspace") {

                if (cursorPos === 0) {

                    e.preventDefault();
                    mergeWithPreviousBlock(block.id);

                }

            }

            // ARROW UP
            if (e.key === "ArrowUp") {

                const atStart = cursorPos === 0;

                if (atStart) {

                    e.preventDefault();
                    moveCursorToPreviousBlock(block.id);

                }

            }

            // ARROW DOWN
            if (e.key === "ArrowDown") {

                const atEnd = cursorPos === textLength;

                if (atEnd) {

                    e.preventDefault();
                    moveCursorToNextBlock(block.id);

                }

            }

        });

        // Input event
        element.addEventListener("input", () => {

            block.data.text = element.innerHTML; // FIX: save formatted HTML

            saveDocument();

            if (block.data.text === "/") { // CHANGE

                 showSlashMenu(element, block.id);

            } else {

                hideSlashMenu();
                
            }

        });
        if (block.type !== "bullet" && block.type !== "numbered") {
            editor.appendChild(element);
        }       
    });

}

// Merge block with previous

function mergeWithPreviousBlock(blockId) {

    const index = documentModel.order.indexOf(blockId);

    if (index === 0) return;

    const prevId = documentModel.order[index - 1];

    const currentBlock = documentModel.blocks[blockId];
    const prevBlock = documentModel.blocks[prevId];

    prevBlock.data.text += currentBlock.data.text; // CHANGE: merge HTML

    delete documentModel.blocks[blockId];

    documentModel.order.splice(index, 1);

    renderDocument(prevId);

}

// Move cursor to previous block

function moveCursorToPreviousBlock(blockId) {

    const index = documentModel.order.indexOf(blockId);

    if (index === 0) return;

    const prevId = documentModel.order[index - 1];

    renderDocument(prevId);

}

// Move cursor to next block

function moveCursorToNextBlock(blockId) {

    const index = documentModel.order.indexOf(blockId);

    if (index === documentModel.order.length - 1) return;

    const nextId = documentModel.order[index + 1];

    renderDocument(nextId);

}

// Slash commands

function handleSlashCommand(block) {

    const command = block.data.text.trim();

    if (command === "/heading") {

        block.type = "heading";
        block.data.text = "";

        renderDocument(block.id);

    }

    if (command === "/paragraph") {

        block.type = "paragraph";
        block.data.text = "";

        renderDocument(block.id);

    }

}

// Save document

function saveDocument() {

    const data = JSON.stringify(documentModel);

    localStorage.setItem("editorDocument", data);

}

// Load document

function loadDocument() {

    const saved = localStorage.getItem("editorDocument");

    if (saved) {
        documentModel = JSON.parse(saved);
    }

}

// Initialize editor

function initializeEditor() {

    loadDocument();

    if (documentModel.order.length === 0) {

        createBlock("paragraph");

    } else {

        renderDocument();

    }

}

// Buttons

document.getElementById("addParagraph").onclick = () => {
    createBlock("paragraph");
};

document.getElementById("addHeading").onclick = () => {
    createBlock("heading");
};

initializeEditor();

// Toolbar Formatting Functions

function applyBold() {
    document.execCommand("bold");
    updateCurrentBlock();
}

function applyItalic() {
    document.execCommand("italic");
    updateCurrentBlock();
}

function applyUnderline() {
    document.execCommand("underline");
    updateCurrentBlock();
}

// FIX: update document model after formatting
function updateCurrentBlock() {

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const block = selection.anchorNode.closest(".block");
    if (!block) return;

    const id = documentModel.order.find(id => {
        return documentModel.blocks[id].data.text === block.innerHTML;
    });

    if (!id) return;

    documentModel.blocks[id].data.text = block.innerHTML;

    saveDocument();
}

// Show Slash Menu

function showSlashMenu(element, blockId) {

    activeSlashBlock = blockId;

    const rect = element.getBoundingClientRect();

    slashMenu.style.top = rect.bottom + "px";
    slashMenu.style.left = rect.left + "px";

    slashMenu.classList.remove("hidden");

}

// Hide Slash Menu

function hideSlashMenu() {
    slashMenu.classList.add("hidden")
}

// Slash Command Clicks

document.querySelectorAll(".slash-item").forEach(item => {

    item.addEventListener("click", () => {

        const command = item.dataset.command;

        if (!activeSlashBlock) return;

        const block = documentModel.blocks[activeSlashBlock];

        if (!block) return;

        if (command === "heading") {
            block.type = "heading";
        }

        if (command === "paragraph") {
            block.type = "paragraph";
        }

        
        if (command === "bullet") {
            block.type = "bullet";
        }

        
        if (command === "numbered") {
            block.type = "numbered";
        }

        block.data.text = "";

        hideSlashMenu();
        renderDocument(activeSlashBlock);

    });

});