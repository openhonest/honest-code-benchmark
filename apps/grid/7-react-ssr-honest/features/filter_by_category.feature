Feature: filter_by_category
  Keep rows matching the given category or return all if "All".

  Scenario: "All" returns every row
    Given rows with categories "Engineering", "Sales", "Marketing"
    When I filter by category "All"
    Then all 3 rows are returned

  Scenario: exact category match keeps matching rows
    Given rows with categories "Engineering", "Sales", "Engineering"
    When I filter by category "Engineering"
    Then 2 rows are returned

  Scenario: no matches returns empty list
    Given rows with categories "Engineering", "Sales"
    When I filter by category "Marketing"
    Then 0 rows are returned
