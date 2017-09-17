document.addEventListener('DOMContentLoaded', function () {
    var self = this;

    self.helper = algoliasearchHelper(
        algoliasearch(window.ALGOLIA_CONFIG.applicationId, window.ALGOLIA_CONFIG.apiKey),
        window.ALGOLIA_CONFIG.indexName
    );
    self.helper.setQueryParameter('distinct', true);
    self.helper.on('result', onResult);

    self.searchInput = document.getElementById("algolia-search-input");
    self.results = document.getElementById("result");

    self.searchForm = document.getElementById("algolia-search-form");
    self.searchForm.addEventListener("submit", handleSearchInputChange);

    self.searchButton = document.getElementById("algolia-search-button");
    self.searchButton.addEventListener("click", handleSearchInputChange);

    function handleSearchInputChange(event) {
        event.stopPropagation();
        event.preventDefault();

        var currentQuery = self.searchInput.value;
        if (self.lastQuery !== currentQuery) {
            self.lastQuery = currentQuery;
            if (self.lastQuery.length === 0) {
                hideResults();
                return false;
            }

            self.helper.setQuery(self.lastQuery).search();
            showResults();
        }
    }

    function onResult(data) {
        if (data.query !== self.lastQuery) {
            return false;
        }
        self.results.innerHTML = data.nbHits ? renderResults(data) : "No results found.";
    }

    function hideResults() {
        self.results.classList.add("hidden");
        self.results.classList.remove("show");
    }

    function showResults() {
        self.results.classList.remove("hidden");
        self.results.classList.add("show");
    }

    function renderResults(data) {
        var records = 0;
        var renderedResults = data.hits.reduce(
            function (acc, hit) {
                if (hit.posted_at) {
                    hit.posted_at_readable = moment.unix(hit.posted_at).format("D MMM YYYY");
                }
                hit.css_selector = encodeURI(hit.css_selector);
                hit.full_url = window.ALGOLIA_CONFIG.baseurl + hit.url;
                return (hit.layout === "post" && hit._highlightResult.title) ? acc += (records++, renderHit(hit)) : acc;
            }, "");
        return `<br/><h3>${records} matches found</h3>` + renderedResults;
    }

    function renderHit(hit) {
        return `<div class="algolia__result">
         <h4>
            <a class="algolia__result-link" href="${hit.full_url}#algolia:${hit.css_selector}">${hit._highlightResult.title.value}</a>
            <small>${hit.posted_at_readable}</small>
         </h4>
         <div class="algolia__result-text">${hit._highlightResult.text.value}</div>
         </div>
         <hr width="100%" class="grad-hr" />`;
    }
});