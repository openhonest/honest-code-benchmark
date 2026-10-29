Feature: paginate
  Slice the rows for the requested page and compute totals.

  Scenario: first page of rows smaller than page size
    Given 10 rows and page size 25
    When I paginate to page 1
    Then I get all 10 rows and totalPages is 1

  Scenario: first page of rows exceeding page size
    Given 60 rows and page size 25
    When I paginate to page 1
    Then I get 25 rows and totalPages is 3

  Scenario: last partial page
    Given 60 rows and page size 25
    When I paginate to page 3
    Then I get 10 rows and totalPages is 3

  Scenario: empty input
    Given 0 rows and page size 25
    When I paginate to page 1
    Then I get 0 rows and totalPages is 1
