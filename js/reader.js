const readerTitle = document.querySelector("#readerTitle");
const readerStatus = document.querySelector("#readerStatus");

const epubReader = document.querySelector("#epubReader");
const epubViewer = document.querySelector("#epubViewer");

const pdfViewer = document.querySelector("#pdfViewer");
const archiveViewer = document.querySelector("#archiveViewer");

const readerError = document.querySelector("#readerError");

const previousPageButton = document.querySelector("#previousPage");
const nextPageButton = document.querySelector("#nextPage");

const params = new URLSearchParams(window.location.search);
const archiveId = params.get("id");

let book = null;
let rendition = null;

if (!archiveId) {
    showMessage(
        "No book selected",
        "Return to search and choose a book."
    );
} else {
    loadBook(archiveId);
}

async function loadBook(identifier) {
    resetReader();

    readerStatus.textContent = "Loading book information...";

    try {
        const response = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(identifier)}`
        );

        if (!response.ok) {
            throw new Error("Could not load book metadata.");
        }

        const metadata = await response.json();

        readerTitle.textContent =
            metadata.metadata?.title || "ReadMe Reader";

        const files = metadata.files || [];

        const epubFile = findEpub(files);
        const pdfFile = findPdf(files);
        const hasScan = detectScan(files);

        /*
            1. Try EPUB first.
        */
        if (epubFile) {
            const epubWorked = await tryEpub(
                identifier,
                epubFile.name
            );

            if (epubWorked) {
                return;
            }
        }

        /*
            2. If EPUB fails or doesn't exist,
               try PDF.
        */
        if (pdfFile) {
            const pdfWorked = await tryPdf(
                identifier,
                pdfFile.name
            );

            if (pdfWorked) {
                return;
            }
        }

        /*
            3. If a scan exists, use Internet Archive
               BookReader.
        */
        if (hasScan) {
            loadArchiveReader(identifier);
            return;
        }

        /*
            4. If the item had an EPUB but we could not
               load it and there was no usable fallback,
               show a friendly message.
        */
        if (epubFile) {
            showEpubMessage();
            return;
        }

        showMessage(
            "Unable to open this book",
            "ReadMe could not find a supported readable format."
        );

    } catch (error) {
        console.error("Reader error:", error);

        showMessage(
            "Unable to open this book",
            "Something went wrong while loading the book."
        );
    }
}

function findEpub(files) {
    return files.find((file) => {
        const name = (file.name || "").toLowerCase();
        const format = (file.format || "").toLowerCase();

        return (
            name.endsWith(".epub") ||
            format.includes("epub")
        );
    }) || null;
}

function findPdf(files) {
    const pdfFiles = files.filter((file) => {
        const name = (file.name || "").toLowerCase();
        const format = (file.format || "").toLowerCase();

        return (
            name.endsWith(".pdf") ||
            format.includes("pdf")
        );
    });

    if (pdfFiles.length === 0) {
        return null;
    }

    const preferredPdf = pdfFiles.find((file) => {
        const name = (file.name || "").toLowerCase();

        return (
            !name.includes("_text") &&
            !name.includes("_bw") &&
            !name.includes("bw.pdf")
        );
    });

    return preferredPdf || pdfFiles[0];
}

function detectScan(files) {
    return files.some((file) => {
        const name = (file.name || "").toLowerCase();
        const format = (file.format || "").toLowerCase();

        return (
            name.includes("scandata.xml") ||
            name.endsWith("_jp2.zip") ||
            name.endsWith("_djvu.xml") ||
            format.includes("scandata") ||
            format.includes("jpeg 2000")
        );
    });
}

async function tryEpub(identifier, filename) {
    resetReader();

    readerStatus.textContent = "Opening EPUB...";

    const epubUrl =
        `https://archive.org/cors/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;

    try {
        book = ePub(epubUrl);

        await book.ready;

        rendition = book.renderTo(
            epubViewer,
            {
                width: "100%",
                height: "75vh"
            }
        );

        await rendition.display();

        epubReader.classList.remove("hidden");
        readerStatus.textContent = "EPUB";

        previousPageButton.onclick = () => {
            if (rendition) {
                rendition.prev();
            }
        };

        nextPageButton.onclick = () => {
            if (rendition) {
                rendition.next();
            }
        };

        document.removeEventListener(
            "keydown",
            handleKeyboardNavigation
        );

        document.addEventListener(
            "keydown",
            handleKeyboardNavigation
        );

        return true;

    } catch (error) {
        console.error("EPUB failed:", error);

        cleanupEpub();

        return false;
    }
}

async function tryPdf(identifier, filename) {
    resetReader();

    readerStatus.textContent = "Opening PDF...";

    const pdfUrl =
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;

    return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
            pdfViewer.onload = null;
            pdfViewer.onerror = null;
        };

        pdfViewer.onload = () => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();

            pdfViewer.classList.remove("hidden");
            readerStatus.textContent = "PDF";

            resolve(true);
        };

        pdfViewer.onerror = () => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();

            console.error("PDF failed to load.");

            resolve(false);
        };

        pdfViewer.src = pdfUrl;

        setTimeout(() => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();

            resolve(false);
        }, 5000);
    });
}

function loadArchiveReader(identifier) {
    resetReader();

    readerStatus.textContent = "Scanned edition";

    archiveViewer.src =
        `https://archive.org/stream/${encodeURIComponent(identifier)}?ui=embed`;

    archiveViewer.classList.remove("hidden");
}

function handleKeyboardNavigation(event) {
    if (!rendition) {
        return;
    }

    if (event.key === "ArrowLeft") {
        rendition.prev();
    }

    if (event.key === "ArrowRight") {
        rendition.next();
    }
}

function cleanupEpub() {
    if (book) {
        book.destroy();
    }

    book = null;
    rendition = null;

    epubViewer.innerHTML = "";
}

function showEpubMessage() {
    resetReader();

    readerStatus.textContent = "EPUB";

    readerError.innerHTML = `
        <h2>EPUB support is coming soon.</h2>
        <p>
            This book is available in EPUB format,
            but it can't be opened in ReadMe yet.
        </p>
    `;

    readerError.classList.remove("hidden");
}

function showMessage(title, message) {
    resetReader();

    readerStatus.textContent = "";

    readerError.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
    `;

    readerError.classList.remove("hidden");
}

function resetReader() {
    cleanupEpub();

    epubReader.classList.add("hidden");
    pdfViewer.classList.add("hidden");
    archiveViewer.classList.add("hidden");
    readerError.classList.add("hidden");

    pdfViewer.src = "";
    archiveViewer.src = "";

    readerError.innerHTML = "";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}