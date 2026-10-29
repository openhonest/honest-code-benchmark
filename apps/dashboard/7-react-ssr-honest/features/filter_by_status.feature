Feature: filter_by_status
  Keep rows matching the given status or return all if "All".

  Scenario: "All" returns every row
    Given rows with statuses "pending", "shipped", "delivered"
    When I filter by status "All"
    Then all 3 rows are returned

  Scenario: matching status keeps only those rows
    Given rows with statuses "pending", "shipped", "pending"
    When I filter by status "pending"
    Then 2 rows are returned and each has status "pending"

  Scenario: no rows match the status
    Given rows with statuses "pending", "shipped"
    When I filter by status "cancelled"
    Then 0 rows are returned

  Scenario: status match is exact
    Given a row with status "shipped"
    When I filter by status "ship"
    Then 0 rows are returned
