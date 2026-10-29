Feature: format_cell
  Format a cell value for display based on column type.

  Scenario: format salary as currency
    Given column "salary" and value 75000
    When I format the cell
    Then the result is "$75,000"

  Scenario: format active boolean as Yes
    Given column "active" and value true
    When I format the cell
    Then the result is "Yes"

  Scenario: format active boolean as No
    Given column "active" and value false
    When I format the cell
    Then the result is "No"

  Scenario: format string column passes through
    Given column "name" and value "Alice"
    When I format the cell
    Then the result is "Alice"

  Scenario: format hireDate passes through
    Given column "hireDate" and value "2023-01-15"
    When I format the cell
    Then the result is "2023-01-15"
