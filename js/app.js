const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#searchInput");
const resultsContainer = document.querySelector("#results");

resultsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".book-cover-button");

    if (!button) {
        return;
    }

    const archiveId = button.dataset.archiveId;

    window.location.href =
        `reader.html?id=${encodeURIComponent(archiveId)}`;
});

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        showStatus("Enter a title, author, or subject to search.");
        return;
    }

    showStatus("Searching...");

    try {
        const searchQuery = `${query} AND ebook_access:public`;

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
    } catch (error) {
        console.error("Error searching Open Library:", error);

        showStatus("Something went wrong while searching.");
    }
});

function displayResults(books) {
    resultsContainer.innerHTML = "";

    if (books.length === 0) {
        showStatus("No freely readable books found.");
        return;
    }

    books.forEach((book) => {
        const bookCard = document.createElement("article");
        bookCard.classList.add("book-card");

        const title = book.title || "Unknown title";

        const author = book.author_name
            ? book.author_name.join(", ")
            : "Unknown author";

        const archiveId = book.ia[0];

        const cover = book.cover_i
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
                <h2 class="book-title">${escapeHtml(title)}</h2>
                <p class="book-author">${escapeHtml(author)}</p>
            </div>
        `;

        resultsContainer.appendChild(bookCard);
    });
}

function showStatus(message) {
    resultsContainer.innerHTML = `
        <p class="status-message">${escapeHtml(message)}</p>
    `;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}