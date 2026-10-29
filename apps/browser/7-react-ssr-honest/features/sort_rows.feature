Feature: sort_rows
  Sort rows by the given column using the dispatch table.

  Scenario: sort by name ascending
    Given rows named "Charlie", "Alice", "Bob"
    When I sort by "name" direction "asc"
    Then the order is "Alice", "Bob", "Charlie"

  Scenario: sort by name descending
    Given rows named "Alice", "Bob", "Charlie"
    When I sort by "name" direction "desc"
    Then the order is "Charlie", "Bob", "Alice"

  Scenario: sort by value ascending
    Given rows with values 300, 100, 200
    When I sort by "value" direction "asc"
    Then the values are in order 100, 200, 300

  Scenario: sort by value descending
    Given rows with values 100, 200, 300
    When I sort by "value" direction "desc"
    Then the values are in order 300, 200, 100

  Scenario: sort preserves original array
    Given rows named "Bob", "Alice"
    When I sort by "name" direction "asc"
    Then the original array is unchanged
