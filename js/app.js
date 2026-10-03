const RESULTS_PER_PAGE = 9;

const searchForm =
    document.querySelector(".search-form");

const searchInput =
    document.querySelector("#searchInput");

const resultsContainer =
    document.querySelector("#results");

const pagination =
    document.querySelector("#pagination");

const previousPageButton =
    document.querySelector("#previousPageButton");

const nextPageButton =
    document.querySelector("#nextPageButton");

const pageIndicator =
    document.querySelector("#pageIndicator");


let currentQuery = "";
let currentPage = 1;
let totalPages = 1;


/*
    Search form
*/

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query =
        searchInput.value.trim();

    if (!query) {
        showStatus(
            "Enter a title, author, or subject to search."
        );

        return;
    }

    /*
        A new search always begins on page 1.
    */

    currentQuery = query;
    currentPage = 1;

    searchBooks(
        currentQuery,
        currentPage
    );
});


/*
    Previous page
*/

previousPageButton.addEventListener(
    "click",
    () => {
        if (currentPage <= 1) {
            return;
        }

        currentPage -= 1;

        searchBooks(
            currentQuery,
            currentPage
        );
    }
);


/*
    Next page
*/

nextPageButton.addEventListener(
    "click",
    () => {
        if (currentPage >= totalPages) {
            return;
        }

        currentPage += 1;

        searchBooks(
            currentQuery,
            currentPage
        );
    }
);


/*
    Open a selected book.

    Preserve:
    - search query
    - current result page
    - selected book
*/

resultsContainer.addEventListener(
    "click",
    (event) => {
        const button =
            event.target.closest(
                ".book-cover-button"
            );

        if (!button) {
            return;
        }

        const archiveId =
            button.dataset.archiveId;

        const readerUrl =
            `reader.html?id=${encodeURIComponent(archiveId)}` +
            `&q=${encodeURIComponent(currentQuery)}` +
            `&page=${currentPage}` +
            `&from=${encodeURIComponent(archiveId)}`;

        window.location.href =
            readerUrl;
    }
);


/*
    Search Open Library
*/

async function searchBooks(
    query,
    page = 1,
    restoreBookId = null
) {
    currentQuery = query;
    currentPage = page;

    showStatus("Searching...");

    hidePagination();


    /*
        Store search state in the URL.

        Example:

        index.html?q=emerson&page=3
    */

    updatePageUrl(
        query,
        page,
        restoreBookId
    );


    try {
        const searchQuery =
            `${query} AND ebook_access:public`;

        const response = await fetch(
            `https://openlibrary.org/search.json` +
            `?q=${encodeURIComponent(searchQuery)}` +
            `&fields=key,title,author_name,cover_i,ia,ebook_access` +
            `&limit=${RESULTS_PER_PAGE}` +
            `&page=${page}`
        );


        if (!response.ok) {
            throw new Error(
                "Search request failed"
            );
        }


        const data =
            await response.json();


        /*
            The Open Library query already asks
            for public ebooks.

            Keep the IA check because ReadMe needs
            an Internet Archive identifier to open
            the reader.
        */

        const readableBooks =
            data.docs.filter((book) => {
                return (
                    book.ebook_access === "public" &&
                    Array.isArray(book.ia) &&
                    book.ia.length > 0
                );
            });


        displayResults(
            readableBooks
        );


        /*
            Open Library reports the total number
            of matching search results in numFound.
        */

        const totalResults =
            data.numFound || 0;

        totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalResults /
                    RESULTS_PER_PAGE
                )
            );


        updatePagination();


        /*
            If the user returned from the reader,
            put the previously selected result
            back into view.
        */

        if (restoreBookId) {
            restoreBookPosition(
                restoreBookId
            );
        } else {
            /*
                Moving between result pages should
                start at the beginning of the grid.
            */

            resultsContainer.scrollIntoView({
                block: "start"
            });
        }

    } catch (error) {
        console.error(
            "Error searching Open Library:",
            error
        );

        showStatus(
            "Something went wrong while searching."
        );
    }
}


/*
    Display books
*/

function displayResults(books) {
    resultsContainer.innerHTML = "";


    if (books.length === 0) {
        showStatus(
            "No freely readable books found on this page."
        );

        return;
    }


    books.forEach((book) => {
        const bookCard =
            document.createElement("article");


        bookCard.classList.add(
            "book-card"
        );


        const title =
            book.title ||
            "Unknown title";


        const author =
            book.author_name
                ? book.author_name.join(", ")
                : "Unknown author";


        const archiveId =
            book.ia[0];


        const cover =
            book.cover_i
                ? `
                    <img
                        src="https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg"
                        alt="Cover of ${escapeHtml(title)}"
                        loading="lazy"
                    >
                `
                : `
                    <div class="book-cover-placeholder">
                        No cover available
                    </div>
                `;


        bookCard.innerHTML = `
            <button
                class="book-cover-button"
                type="button"
                data-archive-id="${escapeHtml(archiveId)}"
                aria-label="Read ${escapeHtml(title)}"
            >
                <div class="book-cover-frame">
                    ${cover}
                </div>
            </button>

            <div class="book-info">

                <h2 class="book-title">
                    ${escapeHtml(title)}
                </h2>

                <p class="book-author">
                    ${escapeHtml(author)}
                </p>

            </div>
        `;


        resultsContainer.appendChild(
            bookCard
        );
    });
}


/*
    Pagination UI
*/

function updatePagination() {
    pagination.classList.remove(
        "hidden"
    );


    pageIndicator.textContent =
        `Page ${currentPage} of ${totalPages}`;


    previousPageButton.disabled =
        currentPage <= 1;


    nextPageButton.disabled =
        currentPage >= totalPages;
}


function hidePagination() {
    pagination.classList.add(
        "hidden"
    );
}


/*
    Store search state in URL
*/

function updatePageUrl(
    query,
    page,
    restoreBookId = null
) {
    const pageUrl =
        new URL(
            window.location.href
        );


    pageUrl.searchParams.set(
        "q",
        query
    );


    pageUrl.searchParams.set(
        "page",
        String(page)
    );


    if (restoreBookId) {
        pageUrl.searchParams.set(
            "from",
            restoreBookId
        );
    } else {
        pageUrl.searchParams.delete(
            "from"
        );
    }


    window.history.replaceState(
        {},
        "",
        pageUrl
    );
}


/*
    Restore previous selected book
*/

function restoreBookPosition(
    archiveId
) {
    const selectedBook =
        resultsContainer.querySelector(
            `.book-cover-button[data-archive-id="${CSS.escape(archiveId)}"]`
        );


    if (!selectedBook) {
        return;
    }


    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            selectedBook.scrollIntoView({
                block: "center",
                inline: "nearest"
            });
        });
    });
}


/*
    Restore search when page loads.

    Example:

    index.html?q=emerson&page=3&from=BOOK_ID
*/

const pageParams =
    new URLSearchParams(
        window.location.search
    );


const savedQuery =
    pageParams.get("q");


const savedPage =
    Number(
        pageParams.get("page")
    ) || 1;


const savedBookId =
    pageParams.get("from");


if (savedQuery) {
    searchInput.value =
        savedQuery;


    currentQuery =
        savedQuery;


    currentPage =
        savedPage;


    searchBooks(
        savedQuery,
        savedPage,
        savedBookId
    );
}


/*
    Status message
*/

function showStatus(message) {
    resultsContainer.innerHTML = `
        <p class="status-message">
            ${escapeHtml(message)}
        </p>
    `;
}


/*
    HTML escaping
*/

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}