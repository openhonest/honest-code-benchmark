Feature: paginate
  Slice the rows for the requested page and compute totals.

  Scenario: first page of results
    Given 50 rows and perPage 25
    When I paginate page 1
    Then pageRows has 25 items and totalPages is 2

  Scenario: last page with partial rows
    Given 30 rows and perPage 25
    When I paginate page 2
    Then pageRows has 5 items and totalPages is 2

  Scenario: page beyond range returns empty
    Given 10 rows and perPage 25
    When I paginate page 2
    Then pageRows has 0 items

  Scenario: empty input returns one page
    Given 0 rows and perPage 25
    When I paginate page 1
    Then totalPages is 1 and pageRows has 0 items
