const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#searchInput");
const resultsContainer = document.querySelector("#results");

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        return;
    }

    resultsContainer.innerHTML = "<p>Searching...</p>";

    try {
        const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error("Search request failed");
        }

        const data = await response.json();

        displayResults(data.docs.slice(0, 10));
    } catch (error) {
        console.error("Error searching Open Library:", error);

        resultsContainer.innerHTML =
            "<p>Something went wrong while searching.</p>";
    }
});

function displayResults(books) {
    resultsContainer.innerHTML = "";

    if (books.length === 0) {
        resultsContainer.innerHTML = "<p>No books found.</p>";
        return;
    }

    books.forEach((book) => {
        const bookElement = document.createElement("div");

        const title = book.title || "Unknown title";
        const author = book.author_name
            ? book.author_name.join(", ")
            : "Unknown author";

        const year = book.first_publish_year || "Unknown year";

        let coverImage = "";

        if (book.cover_i) {
            coverImage = `
        <img
          src="https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg"
          alt="Cover of ${title}"
        >
      `;
        }

        bookElement.innerHTML = `
      ${coverImage}

      <h2>${title}</h2>

      <p>${author}</p>

      <p>${year}</p>
    `;

        resultsContainer.appendChild(bookElement);
    });
}