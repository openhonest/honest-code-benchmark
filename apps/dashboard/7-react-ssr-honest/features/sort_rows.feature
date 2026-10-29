Feature: sort_rows
  Sort rows by the given column using the dispatch table for type.

  Scenario: sort by string column ascending
    Given rows with customerNames "Charlie", "Alice", "Bob"
    When I sort by "customerName" direction "asc"
    Then the order is "Alice", "Bob", "Charlie"

  Scenario: sort by string column descending
    Given rows with customerNames "Alice", "Bob", "Charlie"
    When I sort by "customerName" direction "desc"
    Then the order is "Charlie", "Bob", "Alice"

  Scenario: sort by number column ascending
    Given rows with amounts 99.50, 25.00, 150.75
    When I sort by "amount" direction "asc"
    Then amounts are ordered 25.00, 99.50, 150.75

  Scenario: sort by number column descending
    Given rows with amounts 99.50, 25.00, 150.75
    When I sort by "amount" direction "desc"
    Then amounts are ordered 150.75, 99.50, 25.00

  Scenario: sort dispatches through column_types
    Given the column_types table
    When I look up "string"
    Then it returns compare_string
