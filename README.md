# ReadMe

ReadMe is a browser-based application for finding and reading freely available books online.

## MVP

The current MVP is intentionally simple and stateless.

Core flow:

1. Search Open Library.
2. Display search results.
3. Identify books that are freely readable online.
4. Open a selected book inside ReadMe.

## Reader Plan

- PDF files: use the browser's native PDF viewer.
- EPUB files: render with `epub.js`.

## Deferred Features

The following features are outside the current MVP:

- User accounts
- Saved books
- Audiobook integration
- Social features
- Multi-library aggregation

## Current Implementation

The project currently includes:

- A simple search homepage
- Open Library API search
- Search results displaying:
  - cover
  - title
  - author
  - first publication year

## Current Structure

```text
CSC154_ReadMe/
├── index.html
├── js/
│   └── app.js
└── README.md
```

## Current Status

The search form is connected to the Open Library API and successfully renders the first 10 returned results on the page.

The current result layout is functional but minimally styled.

## Next Steps

1. Style search results into simple horizontal rows/cards.
2. Filter results to books that can actually be read online.
3. Add a book details view.
4. Add the ReadMe reader.

## Development Notes

Keep the implementation incremental and focused on the MVP.

Avoid adding non-core features before the main reading flow works end to end.

When using an AI coding assistant such as Codex, have it read this file along with `index.html` and `js/app.js` before making changes.

A useful prompt is:

> Read `README.md`, `index.html`, and `js/app.js` first. We have a working Open Library search that renders the first 10 results. Do not redesign the app or change the API flow unless asked. Continue from the current MVP and make only the requested change.
