const readerTitle =
    document.querySelector("#readerTitle");

const readerStatus =
    document.querySelector("#readerStatus");

const epubReader =
    document.querySelector("#epubReader");

const epubViewer =
    document.querySelector("#epubViewer");

const pdfViewer =
    document.querySelector("#pdfViewer");

const archiveViewer =
    document.querySelector("#archiveViewer");

const readerError =
    document.querySelector("#readerError");

const previousPageButton =
    document.querySelector("#previousPage");

const nextPageButton =
    document.querySelector("#nextPage");

const backToSearch =
    document.querySelector("#backToSearch");


const params =
    new URLSearchParams(window.location.search);

const archiveId =
    params.get("id");

const searchQuery =
    params.get("q");

const searchPage =
    Number(params.get("page")) || 1;

const previousBookId =
    params.get("from");


const METADATA_TIMEOUT = 8000;
const EPUB_TIMEOUT = 5000;
const PDF_TIMEOUT = 5000;


let book = null;
let rendition = null;


/*
    Configure Back to search.
*/

if (backToSearch) {
    const backUrl =
        new URL(
            "index.html",
            window.location.href
        );

    if (searchQuery) {
        backUrl.searchParams.set(
            "q",
            searchQuery
        );
    }

    backUrl.searchParams.set(
        "page",
        String(searchPage)
    );

    if (previousBookId) {
        backUrl.searchParams.set(
            "from",
            previousBookId
        );
    }

    backToSearch.href =
        backUrl.href;
}


/*
    Start reader.
*/

if (!archiveId) {
    showMessage(
        "No book selected",
        "Return to search and choose a book."
    );
} else {
    loadBook(archiveId);
}


/*
    Load Internet Archive metadata.
*/

async function loadBook(identifier) {
    resetReader();

    readerStatus.textContent =
        "Loading book information...";

    try {
        const metadataUrl =
            `https://archive.org/metadata/${encodeURIComponent(identifier)}`;

        const response =
            await fetchWithTimeout(
                metadataUrl,
                METADATA_TIMEOUT
            );

        if (!response.ok) {
            throw new Error(
                "Could not load book metadata."
            );
        }

        const metadata =
            await response.json();

        readerTitle.textContent =
            metadata.metadata?.title ||
            "ReadMe Reader";

        const files =
            metadata.files || [];

        const epubFile =
            findEpub(files);

        const pdfFile =
            findPdf(files);

        const hasScan =
            detectScan(files);


        /*
            1. Try EPUB.
        */

        if (epubFile) {
            const epubWorked =
                await tryEpub(
                    identifier,
                    epubFile.name
                );

            if (epubWorked) {
                return;
            }
        }


        /*
            2. Try PDF.
        */

        if (pdfFile) {
            const pdfWorked =
                await tryPdf(
                    identifier,
                    pdfFile.name
                );

            if (pdfWorked) {
                return;
            }
        }


        /*
            3. Try scanned edition.
        */

        if (hasScan) {
            loadArchiveReader(
                identifier
            );

            return;
        }


        /*
            4. EPUB existed but couldn't be displayed.
        */

        if (epubFile) {
            showEpubMessage();

            return;
        }


        /*
            5. Nothing usable.
        */

        showMessage(
            "Unable to open this book",
            "ReadMe could not find a supported readable format."
        );

    } catch (error) {
        console.error(
            "Reader error:",
            error
        );

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


/*
    EPUB detection.
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
    }) || null;
}


/*
    PDF detection.
*/

function findPdf(files) {
    const pdfFiles =
        files.filter((file) => {
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

    const preferredPdf =
        pdfFiles.find((file) => {
            const name =
                (file.name || "").toLowerCase();

            return (
                !name.includes("_text") &&
                !name.includes("_bw") &&
                !name.includes("bw.pdf")
            );
        });

    return (
        preferredPdf ||
        pdfFiles[0]
    );
}


/*
    Scan detection.
*/

function detectScan(files) {
    return files.some((file) => {
        const name =
            (file.name || "").toLowerCase();

        const format =
            (file.format || "").toLowerCase();

        return (
            name.includes("scandata.xml") ||
            name.endsWith("_jp2.zip") ||
            name.endsWith("_djvu.xml") ||
            format.includes("scandata") ||
            format.includes("jpeg 2000")
        );
    });
}


/*
    EPUB reader.
*/

async function tryEpub(
    identifier,
    filename
) {
    resetReader();

    readerStatus.textContent =
        "Opening EPUB...";

    const epubUrl =
        `https://archive.org/cors/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;

    try {
        book =
            ePub(epubUrl);

        await Promise.race([
            book.ready,
            timeout(EPUB_TIMEOUT)
        ]);

        rendition =
            book.renderTo(
                epubViewer,
                {
                    width: "100%",
                    height: "75vh"
                }
            );

        await Promise.race([
            rendition.display(),
            timeout(EPUB_TIMEOUT)
        ]);

        const renderedIframe =
            epubViewer.querySelector(
                "iframe"
            );

        if (!renderedIframe) {
            throw new Error(
                "EPUB did not create a reader."
            );
        }

        epubReader.classList.remove(
            "hidden"
        );

        readerStatus.textContent =
            "EPUB";

        previousPageButton.onclick =
            () => {
                if (rendition) {
                    rendition.prev();
                }
            };

        nextPageButton.onclick =
            () => {
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
        console.error(
            "EPUB failed:",
            error
        );

        cleanupEpub();

        return false;
    }
}


/*
    PDF reader.
*/

async function tryPdf(
    identifier,
    filename
) {
    resetReader();

    readerStatus.textContent =
        "Opening PDF...";

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

            pdfViewer.classList.remove(
                "hidden"
            );

            readerStatus.textContent =
                "PDF";

            resolve(true);
        };

        pdfViewer.onerror = () => {
            if (settled) {
                return;
            }

            settled = true;

            cleanup();

            console.error(
                "PDF failed to load."
            );

            resolve(false);
        };

        pdfViewer.src =
            pdfUrl;

        setTimeout(() => {
            if (settled) {
                return;
            }

            settled = true;

            cleanup();

            resolve(false);

        }, PDF_TIMEOUT);
    });
}


/*
    Internet Archive BookReader.
*/

function loadArchiveReader(identifier) {
    resetReader();

    readerStatus.textContent =
        "Scanned edition";

    archiveViewer.src =
        `https://archive.org/stream/${encodeURIComponent(identifier)}?ui=embed`;

    archiveViewer.classList.remove(
        "hidden"
    );
}


/*
    EPUB keyboard navigation.
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
    Clean up EPUB state.
*/

function cleanupEpub() {
    document.removeEventListener(
        "keydown",
        handleKeyboardNavigation
    );

    if (book) {
        try {
            book.destroy();
        } catch (error) {
            console.warn(
                "EPUB cleanup warning:",
                error
            );
        }
    }

    book = null;
    rendition = null;

    if (epubViewer) {
        epubViewer.innerHTML = "";
    }
}


/*
    EPUB unavailable.
*/

function showEpubMessage() {
    resetReader();

    readerStatus.textContent =
        "EPUB";

    readerError.innerHTML = `
        <h2>
            EPUB support is coming soon.
        </h2>

        <p>
            This book is available in EPUB format,
            but it can't be opened in ReadMe yet.
        </p>
    `;

    readerError.classList.remove(
        "hidden"
    );
}


/*
    General message.
*/

function showMessage(
    title,
    message
) {
    resetReader();

    readerStatus.textContent =
        "";

    readerError.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
    `;

    readerError.classList.remove(
        "hidden"
    );
}


/*
    Reset reader.
*/

function resetReader() {
    cleanupEpub();

    epubReader.classList.add(
        "hidden"
    );

    pdfViewer.classList.add(
        "hidden"
    );

    archiveViewer.classList.add(
        "hidden"
    );

    readerError.classList.add(
        "hidden"
    );

    pdfViewer.removeAttribute(
        "src"
    );

    archiveViewer.removeAttribute(
        "src"
    );

    readerError.innerHTML =
        "";
}


/*
    Fetch with timeout.
*/

async function fetchWithTimeout(
    url,
    milliseconds
) {
    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {
            controller.abort();
        }, milliseconds);

    try {
        return await fetch(
            url,
            {
                signal:
                    controller.signal
            }
        );
    } finally {
        clearTimeout(
            timeoutId
        );
    }
}


/*
    Promise timeout helper.
*/

function timeout(milliseconds) {
    return new Promise(
        (resolve, reject) => {
            setTimeout(() => {
                reject(
                    new Error(
                        "Reader timed out."
                    )
                );
            }, milliseconds);
        }
    );
}


/*
    HTML escaping.
*/

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}