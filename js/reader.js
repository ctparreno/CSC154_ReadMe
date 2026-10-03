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
    showError("No book was selected.");
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
            throw new Error("Could not load Internet Archive metadata.");
        }

        const metadata = await response.json();

        readerTitle.textContent =
            metadata.metadata?.title || "ReadMe Reader";

        const files = metadata.files || [];

        const epubFile = findEpub(files);
        const pdfFile = findPdf(files);

        /*
            Try EPUB first because it gives us
            the cleanest custom reader experience.
        */
        if (epubFile) {
            const epubWorked = await tryEpub(identifier, epubFile.name);

            if (epubWorked) {
                return;
            }
        }

        /*
            If EPUB is unavailable or fails,
            try PDF.
        */
        if (pdfFile) {
            const pdfWorked = await tryPdf(identifier, pdfFile.name);

            if (pdfWorked) {
                return;
            }
        }

        /*
            Final fallback: Internet Archive reader.
        */
        loadArchiveReader(identifier);

    } catch (error) {
        console.error("Reader error:", error);
        loadArchiveReader(identifier);
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

async function tryEpub(identifier, filename) {
    resetReader();

    readerStatus.textContent = "Opening EPUB...";

    const epubUrl =
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;

    try {
        book = ePub(epubUrl);

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

        if (book) {
            book.destroy();
        }

        book = null;
        rendition = null;

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

        /*
            Some browsers do not reliably fire iframe
            errors for failed PDF loads, so give it a
            short timeout and fall back if nothing happens.
        */
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

    readerStatus.textContent =
        "Internet Archive reader";

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

function resetReader() {
    epubReader.classList.add("hidden");
    pdfViewer.classList.add("hidden");
    archiveViewer.classList.add("hidden");
    readerError.classList.add("hidden");

    readerError.innerHTML = "";

    pdfViewer.src = "";
    archiveViewer.src = "";
}

function showError(message) {
    resetReader();

    readerTitle.textContent = "Reader";
    readerStatus.textContent = "";

    readerError.innerHTML = `
        <h2>Unable to open this book</h2>
        <p>${escapeHtml(message)}</p>
    `;

    readerError.classList.remove("hidden");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}