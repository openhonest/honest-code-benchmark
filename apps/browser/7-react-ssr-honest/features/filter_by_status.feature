Feature: filter_by_status
  Keep rows matching the given status or return all when status is absent.

  Scenario: null status returns all rows
    Given rows with statuses active, inactive, pending
    When I filter with status null
    Then all 3 rows are returned

  Scenario: "all" string returns all rows
    Given rows with statuses active, inactive, pending
    When I filter with status "all"
    Then all 3 rows are returned

  Scenario: specific status keeps only matching rows
    Given rows with statuses active, inactive, active
    When I filter with status "active"
    Then 2 rows are returned and all have status "active"

  Scenario: status with no matches returns empty
    Given rows with statuses active, inactive
    When I filter with status "flagged"
    Then 0 rows are returned
