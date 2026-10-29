Feature: build_page
  Load data, filter, sort, paginate, format and render the full HTML page.

  Scenario: builds a page with default view state
    Given a data file with 100 rows
    When I build the page with no filter and page 1
    Then the result is an HTML string
    And it contains a table with rows
    And it embeds the data for hydration

  Scenario: builds a page with active filter
    Given a data file with 100 rows
    When I build the page filtered by "Engineering"
    Then the result contains only Engineering department rows

  Scenario: builds a page sorted by salary descending
    Given a data file with 100 rows
    When I build the page sorted by "salary" direction "desc"
    Then the first row has the highest salary
