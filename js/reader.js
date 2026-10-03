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
    new URLSearchParams(
        window.location.search
    );


const archiveId =
    params.get("id");


const searchQuery =
    params.get("q");


const searchPage =
    Number(
        params.get("page")
    ) || 1;


const previousBookId =
    params.get("from");


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