Feature: filter_by_date_range
  Keep rows whose date falls within the from/to range inclusive.

  Scenario: empty from and to returns all rows
    Given rows with dates "2024-01-01", "2024-06-15", "2024-12-31"
    When I filter with from "" and to ""
    Then all 3 rows are returned

  Scenario: from date only keeps rows on or after
    Given rows with dates "2024-01-01", "2024-06-15", "2024-12-31"
    When I filter with from "2024-06-15" and to ""
    Then 2 rows are returned

  Scenario: to date only keeps rows on or before
    Given rows with dates "2024-01-01", "2024-06-15", "2024-12-31"
    When I filter with from "" and to "2024-06-15"
    Then 2 rows are returned

  Scenario: both from and to narrows the range
    Given rows with dates "2024-01-01", "2024-06-15", "2024-12-31"
    When I filter with from "2024-03-01" and to "2024-09-01"
    Then 1 row is returned with date "2024-06-15"

  Scenario: boundary dates are inclusive
    Given a row with date "2024-06-15"
    When I filter with from "2024-06-15" and to "2024-06-15"
    Then the row is included
