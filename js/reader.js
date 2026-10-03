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

let book;
let rendition;


/*
    Start reader
*/

if (!archiveId) {
    showError("No book was selected.");
} else {
    loadBook(archiveId);
}


/*
    Fetch Internet Archive metadata
*/

async function loadBook(identifier) {

    try {

        readerStatus.textContent = "Loading book information...";

        const response = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(identifier)}`
        );

        if (!response.ok) {
            throw new Error("Could not load Internet Archive metadata.");
        }

        const metadata = await response.json();

        const title =
            metadata.metadata?.title ||
            "ReadMe Reader";

        readerTitle.textContent = title;

        const files = metadata.files || [];

        const epubFile = findEpub(files);
        const pdfFile = findPdf(files);


        /*
            Prefer EPUB because it gives ReadMe
            the cleanest custom reading experience.
        */

        if (epubFile) {

            loadEpub(identifier, epubFile.name);

            return;
        }


        /*
            Otherwise use browser-native PDF.
        */

        if (pdfFile) {

            loadPdf(identifier, pdfFile.name);

            return;
        }


        /*
            Some Internet Archive books are scans
            without a convenient EPUB/PDF file.

            In that case use Internet Archive's
            embedded BookReader.
        */

        loadArchiveReader(identifier);

    } catch (error) {

        console.error("Reader error:", error);

        showError(
            "Something went wrong while loading this book."
        );
    }
}


/*
    Find EPUB
*/

function findEpub(files) {

    return files.find((file) => {

        const name =
            (file.name || "").toLowerCase();

        const format =
            (file.format || "").toLowerCase();

        return (
            name.endsWith(".epub") ||
            format.includes("epub")
        );

    });
}


/*
    Find PDF

    Avoid some derivative/internal files where possible.
*/

function findPdf(files) {

    const pdfFiles = files.filter((file) => {

        const name =
            (file.name || "").toLowerCase();

        const format =
            (file.format || "").toLowerCase();

        return (
            name.endsWith(".pdf") ||
            format.includes("pdf")
        );

    });


    if (pdfFiles.length === 0) {
        return null;
    }


    /*
        Prefer a normal PDF over text-layer
        or derivative variants.
    */

    const preferredPdf = pdfFiles.find((file) => {

        const name =
            (file.name || "").toLowerCase();

        return (
            !name.includes("_text") &&
            !name.includes("bw.pdf") &&
            !name.includes("_bw")
        );

    });


    return preferredPdf || pdfFiles[0];
}


/*
    EPUB reader
*/

function loadEpub(identifier, filename) {

    hideReaders();

    readerStatus.textContent = "EPUB";

    epubReader.classList.remove("hidden");

    const epubUrl =
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;


    book = ePub(epubUrl);


    rendition = book.renderTo(
        epubViewer,
        {
            width: "100%",
            height: "75vh"
        }
    );


    rendition.display();


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


    /*
        Arrow-key navigation
    */

    document.addEventListener(
        "keydown",
        handleKeyboardNavigation
    );
}


/*
    PDF reader
*/

function loadPdf(identifier, filename) {

    hideReaders();

    readerStatus.textContent = "PDF";

    const pdfUrl =
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;


    pdfViewer.src = pdfUrl;

    pdfViewer.classList.remove("hidden");
}


/*
    Internet Archive BookReader fallback
*/

function loadArchiveReader(identifier) {

    hideReaders();

    readerStatus.textContent =
        "Internet Archive reader";

    archiveViewer.src =
        `https://archive.org/embed/${encodeURIComponent(identifier)}`;

    archiveViewer.classList.remove("hidden");
}


/*
    Keyboard controls for EPUB
*/

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


/*
    Hide every possible reader
*/

function hideReaders() {

    epubReader.classList.add("hidden");

    pdfViewer.classList.add("hidden");

    archiveViewer.classList.add("hidden");

    readerError.classList.add("hidden");
}


/*
    Error display
*/

function showError(message) {

    hideReaders();

    readerTitle.textContent = "Reader";

    readerStatus.textContent = "";

    readerError.innerHTML = `
        <h2>Unable to open this book</h2>
        <p>${escapeHtml(message)}</p>
    `;

    readerError.classList.remove("hidden");
}


/*
    Safely display strings inside HTML
*/

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}