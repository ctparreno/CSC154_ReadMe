const METADATA_TIMEOUT_MS = 8000;
const EPUB_TIMEOUT_MS = 5000;
const PDF_TIMEOUT_MS = 5000;

const readerTitle = document.querySelector("#readerTitle");
const readerStatus = document.querySelector("#readerStatus");

const epubReader = document.querySelector("#epubReader");
const epubViewer = document.querySelector("#epubViewer");

const pdfViewer = document.querySelector("#pdfViewer");
const archiveViewer = document.querySelector("#archiveViewer");

const readerError = document.querySelector("#readerError");

const previousPageButton = document.querySelector("#previousPage");
const nextPageButton = document.querySelector("#nextPage");

const backToSearch = document.querySelector("#backToSearch");

const params = new URLSearchParams(window.location.search);

const archiveId = params.get("id");
const searchQuery = params.get("q");
const searchPage = Number(params.get("page")) || 1;
const previousBookId = params.get("from");

let book = null;
let rendition = null;


// Back to search
configureBackLink();


// Start reader
if (!archiveId) {
    showMessage(
        "No book selected",
        "Return to search and choose a book."
    );
} else {
    loadBook(archiveId);
}


function configureBackLink() {
    if (!backToSearch) {
        return;
    }

    const backUrl = new URL("index.html", window.location.href);

    if (searchQuery) {
        backUrl.searchParams.set("q", searchQuery);
    }

    backUrl.searchParams.set("page", String(searchPage));

    if (previousBookId) {
        backUrl.searchParams.set("from", previousBookId);
    }

    backToSearch.href = backUrl.href;
}


async function loadBook(identifier) {
    resetReader();
    readerStatus.textContent = "Loading book information...";

    try {
        const metadataUrl =
            `https://archive.org/metadata/${encodeURIComponent(identifier)}`;

        const response = await fetchWithTimeout(
            metadataUrl,
            METADATA_TIMEOUT_MS
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

        // EPUB → PDF → scan fallback
        if (epubFile && await tryEpub(identifier, epubFile.name)) {
            return;
        }

        if (pdfFile && await tryPdf(identifier, pdfFile.name)) {
            return;
        }

        if (hasScan) {
            loadArchiveReader(identifier);
            return;
        }

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

        if (error.name === "AbortError") {
            showMessage(
                "Book information is taking too long to load",
                "Please try this book again in a moment."
            );
            return;
        }

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

    return pdfFiles.find((file) => {
        const name = (file.name || "").toLowerCase();

        return (
            !name.includes("_text") &&
            !name.includes("_bw") &&
            !name.includes("bw.pdf")
        );
    }) || pdfFiles[0];
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

        await Promise.race([
            book.ready,
            timeout(EPUB_TIMEOUT_MS)
        ]);

        rendition = book.renderTo(epubViewer, {
            width: "100%",
            height: "75vh"
        });

        await Promise.race([
            rendition.display(),
            timeout(EPUB_TIMEOUT_MS)
        ]);

        if (!epubViewer.querySelector("iframe")) {
            throw new Error("EPUB did not create a reader.");
        }

        epubReader.classList.remove("hidden");
        readerStatus.textContent = "EPUB";

        previousPageButton.onclick = () => rendition?.prev();
        nextPageButton.onclick = () => rendition?.next();

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

        const finish = (worked) => {
            if (settled) {
                return;
            }

            settled = true;

            pdfViewer.onload = null;
            pdfViewer.onerror = null;

            resolve(worked);
        };

        pdfViewer.onload = () => {
            pdfViewer.classList.remove("hidden");
            readerStatus.textContent = "PDF";
            finish(true);
        };

        pdfViewer.onerror = () => {
            console.error("PDF failed to load.");
            finish(false);
        };

        pdfViewer.src = pdfUrl;

        setTimeout(() => {
            finish(false);
        }, PDF_TIMEOUT_MS);
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
    document.removeEventListener(
        "keydown",
        handleKeyboardNavigation
    );

    if (book) {
        try {
            book.destroy();
        } catch (error) {
            console.warn("EPUB cleanup warning:", error);
        }
    }

    book = null;
    rendition = null;

    if (epubViewer) {
        epubViewer.innerHTML = "";
    }
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

    pdfViewer.removeAttribute("src");
    archiveViewer.removeAttribute("src");

    readerError.innerHTML = "";
}


async function fetchWithTimeout(url, milliseconds) {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, milliseconds);

    try {
        return await fetch(url, {
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}


function timeout(milliseconds) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("Reader timed out."));
        }, milliseconds);
    });
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}