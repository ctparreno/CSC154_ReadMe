const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#searchInput");
const resultsContainer = document.querySelector("#results");


/*
    Open a selected book while preserving:
    - the current search query
    - the current scroll position
*/

resultsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".book-cover-button");

    if (!button) {
        return;
    }

    const archiveId = button.dataset.archiveId;
    const query = searchInput.value.trim();
    const scrollPosition = Math.round(window.scrollY);

    const readerUrl =
        `reader.html?id=${encodeURIComponent(archiveId)}` +
        `&q=${encodeURIComponent(query)}` +
        `&scroll=${scrollPosition}`;

    window.location.href = readerUrl;
});


/*
    Search form
*/

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        showStatus("Enter a title, author, or subject to search.");
        return;
    }

    searchBooks(query);
});


/*
    Perform Open Library search
*/

async function searchBooks(query, restoreScroll = 0) {
    showStatus("Searching...");

    /*
        Store the search in the page URL.

        Example:
        index.html?q=dune
    */

    const pageUrl = new URL(window.location.href);

    pageUrl.searchParams.set("q", query);

    /*
        Remove an old scroll value when the user
        starts a fresh search manually.
    */

    if (restoreScroll > 0) {
        pageUrl.searchParams.set(
            "scroll",
            String(restoreScroll)
        );
    } else {
        pageUrl.searchParams.delete("scroll");
    }

    window.history.replaceState(
        {},
        "",
        pageUrl
    );

    try {
        const searchQuery =
            `${query} AND ebook_access:public`;

        const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&fields=key,title,author_name,cover_i,ia,ebook_access&limit=9`
        );

        if (!response.ok) {
            throw new Error("Search request failed");
        }

        const data = await response.json();

        const readableBooks = data.docs.filter((book) => {
            return (
                book.ebook_access === "public" &&
                Array.isArray(book.ia) &&
                book.ia.length > 0
            );
        });

        displayResults(readableBooks);

        /*
            Restore the previous scroll position
            after the results are back in the DOM.
        */

        if (restoreScroll > 0) {
            requestAnimationFrame(() => {
                window.scrollTo(
                    0,
                    restoreScroll
                );
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
    Display search results
*/

function displayResults(books) {
    resultsContainer.innerHTML = "";

    if (books.length === 0) {
        showStatus(
            "No freely readable books found."
        );

        return;
    }

    books.forEach((book) => {
        const bookCard =
            document.createElement("article");

        bookCard.classList.add("book-card");

        const title =
            book.title || "Unknown title";

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

        resultsContainer.appendChild(bookCard);
    });
}


/*
    Restore previous search state from URL.

    Example:
    index.html?q=dune&scroll=850
*/

const pageParams =
    new URLSearchParams(window.location.search);

const savedQuery =
    pageParams.get("q");

const savedScroll =
    Number(pageParams.get("scroll")) || 0;

if (savedQuery) {
    searchInput.value = savedQuery;

    searchBooks(
        savedQuery,
        savedScroll
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