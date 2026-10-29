Feature: sort_rows
  Sort rows by the given column using the dispatch table.

  Scenario: sort by string column ascending
    Given rows with names "Charlie", "Alice", "Bob"
    When I sort by "name" direction "asc"
    Then the order is "Alice", "Bob", "Charlie"

  Scenario: sort by string column descending
    Given rows with names "Alice", "Bob", "Charlie"
    When I sort by "name" direction "desc"
    Then the order is "Charlie", "Bob", "Alice"

  Scenario: sort by number column ascending
    Given rows with salaries 50000, 30000, 70000
    When I sort by "salary" direction "asc"
    Then salaries are ordered 30000, 50000, 70000

  Scenario: sort by boolean column ascending
    Given rows with active values false, true, false
    When I sort by "active" direction "asc"
    Then active values are ordered false, false, true

  Scenario: sort dispatches through sort_comparators
    Given the sort_comparators table
    When I look up "string"
    Then it returns compare_string
