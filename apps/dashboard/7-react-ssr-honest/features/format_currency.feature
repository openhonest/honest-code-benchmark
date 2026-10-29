Feature: format_currency
  Format a number as USD currency with two decimal places.

  Scenario: formats a whole number
    Given the value 1000
    When I format as currency
    Then the result is "$1,000.00"

  Scenario: formats a decimal value
    Given the value 1234.5
    When I format as currency
    Then the result is "$1,234.50"

  Scenario: formats zero
    Given the value 0
    When I format as currency
    Then the result is "$0.00"

  Scenario: formats large numbers with commas
    Given the value 1234567.89
    When I format as currency
    Then the result is "$1,234,567.89"
