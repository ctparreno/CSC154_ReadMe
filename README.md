# ReadMe

ReadMe is a browser-based application for finding and reading freely available books online.

## MVP Goal

The MVP is intentionally small and stateless.

Core flow:

1. Search Open Library
2. Show books that are freely readable
3. Click a book cover
4. Open the selected book inside ReadMe's browser-based reader

## Design Direction

The interface follows a simple library-style layout:

- Clean white / light background
- Blue accent color
- Search-first homepage
- Responsive cover grid for results
- Book cover is the main interaction target
- Title and author appear below each cover
- No accounts, saved books, or social features in the MVP

### Result Grid

- 3 columns on desktop
- 2 columns on tablet
- 1 column on small mobile screens

## Reader Plan

- PDF files: use the browser's native PDF viewer
- EPUB files: render with epub.js

## Deferred Features

These are outside the current MVP:

- User accounts
- Saved books
- Audiobook integration
- Social features
- Multi-library aggregation

## Current Implementation

The project currently includes:

- Search homepage
- Open Library API integration
- Search results from Open Library
- Cover, title, and author display
- Responsive result grid
- Basic loading, empty-search, and error states

## Current Structure

```text
CSC154_ReadMe/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    └── app.js