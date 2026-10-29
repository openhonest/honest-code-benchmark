Feature: paginate
  Slice the rows for the requested page and compute totals.

  Scenario: first page of results
    Given 25 filtered rows and perPage 10
    When I paginate to page 1
    Then pageRows has 10 rows
    And totalPages is 3
    And totalFiltered is 25

  Scenario: last partial page
    Given 25 filtered rows and perPage 10
    When I paginate to page 3
    Then pageRows has 5 rows

  Scenario: page beyond range returns empty
    Given 10 filtered rows and perPage 10
    When I paginate to page 5
    Then pageRows has 0 rows

  Scenario: single row on a single page
    Given 1 filtered row and perPage 10
    When I paginate to page 1
    Then pageRows has 1 row
    And totalPages is 1
