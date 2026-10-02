const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#searchInput");
const resultsContainer = document.querySelector("#results");

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        showStatus("Enter a title, author, or subject to search.");
        return;
    }

    showStatus("Searching...");

    try {
        const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error("Search request failed");
        }

        const data = await response.json();

        displayResults(data.docs.slice(0, 9));
    } catch (error) {
        console.error("Error searching Open Library:", error);

        showStatus("Something went wrong while searching.");
    }
});

function displayResults(books) {
    resultsContainer.innerHTML = "";

    if (books.length === 0) {
        showStatus("No books found.");
        return;
    }

    books.forEach((book) => {
        const bookCard = document.createElement("article");
        bookCard.classList.add("book-card");

        const title = book.title || "Unknown title";

        const author = book.author_name
            ? book.author_name.join(", ")
            : "Unknown author";

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
            <div class="book-cover-frame">
                ${cover}
            </div>

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