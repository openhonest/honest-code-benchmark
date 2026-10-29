Feature: format_value
  Format a numeric value as US dollar currency.

  Scenario: whole dollar amount
    Given value 1500
    When I format it
    Then the result is "$1,500"

  Scenario: zero value
    Given value 0
    When I format it
    Then the result is "$0"

  Scenario: large value with comma grouping
    Given value 1234567
    When I format it
    Then the result is "$1,234,567"
