Feature: paginate
  Slice the rows for the requested page and compute totals.

  Scenario: first page returns correct slice
    Given 60 rows and page size 25
    When I request page 1
    Then 25 rows are returned with totalPages 3

  Scenario: last partial page
    Given 60 rows and page size 25
    When I request page 3
    Then 10 rows are returned

  Scenario: page beyond range returns empty
    Given 10 rows and page size 25
    When I request page 2
    Then 0 rows are returned

  Scenario: single row on single page
    Given 1 row and page size 25
    When I request page 1
    Then 1 row is returned with totalPages 1

  Scenario: empty input gives one empty page
    Given 0 rows and page size 25
    When I request page 1
    Then 0 rows are returned with totalPages 1
