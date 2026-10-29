Feature: format_number
  Format a number with two decimal places.

  Scenario: formats integer to two decimals
    Given the value 1000
    When I format the number
    Then the result is "1,000.00"

  Scenario: formats float to two decimals
    Given the value 1234.5
    When I format the number
    Then the result is "1,234.50"

  Scenario: formats zero
    Given the value 0
    When I format the number
    Then the result is "0.00"

  Scenario: formats negative number
    Given the value -500.123
    When I format the number
    Then the result is "-500.12"
