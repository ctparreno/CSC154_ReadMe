const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#searchInput");

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        return;
    }

    try {
        const response = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error("Search request failed");
        }

        const data = await response.json();

        console.log(data.docs);
    } catch (error) {
        console.error("Error searching Open Library:", error);
    }
});