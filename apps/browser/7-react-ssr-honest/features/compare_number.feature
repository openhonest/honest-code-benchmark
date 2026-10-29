Feature: compare_number
  Numeric comparison returning -1, 0 or 1.

  Scenario: a less than b
    Given numbers 1 and 5
    When I compare them
    Then the result is -1

  Scenario: equal numbers
    Given numbers 3 and 3
    When I compare them
    Then the result is 0

  Scenario: a greater than b
    Given numbers 10 and 2
    When I compare them
    Then the result is 1
