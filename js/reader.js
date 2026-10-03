const readerTitle = document.querySelector("#readerTitle");
const readerStatus = document.querySelector("#readerStatus");

const epubReader = document.querySelector("#epubReader");
const pdfViewer = document.querySelector("#pdfViewer");
const archiveViewer = document.querySelector("#archiveViewer");
const readerError = document.querySelector("#readerError");

const params = new URLSearchParams(window.location.search);
const archiveId = params.get("id");

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

        const pdfFile = findPdf(files);
        const epubFile = findEpub(files);
        const hasScan = detectScan(files);

        /*
            Prefer Internet Archive BookReader
            when this is a scanned book.
        */
        if (hasScan) {
            loadArchiveReader(identifier);
            return;
        }

        /*
            Otherwise try a direct PDF.
        */
        if (pdfFile) {
            loadPdf(identifier, pdfFile.name);
            return;
        }

        /*
            EPUB is part of the project plan,
            but is not opened directly yet.
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

    /*
        Avoid OCR/text-only or black-and-white
        derivative PDFs when possible.
    */
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

function loadPdf(identifier, filename) {
    resetReader();

    readerStatus.textContent = "PDF";

    const pdfUrl =
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;

    pdfViewer.src = pdfUrl;

    pdfViewer.classList.remove("hidden");
}

function loadArchiveReader(identifier) {
    resetReader();

    readerStatus.textContent = "Scanned edition";

    archiveViewer.src =
        `https://archive.org/stream/${encodeURIComponent(identifier)}?ui=embed`;

    archiveViewer.classList.remove("hidden");
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
    if (epubReader) {
        epubReader.classList.add("hidden");
    }

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