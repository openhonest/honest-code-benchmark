Feature: compare_number
  Numeric comparison returning -1, 0 or 1.

  Scenario: equal numbers return 0
    Given numbers 42 and 42
    When I compare them
    Then the result is 0

  Scenario: first less than second returns -1
    Given numbers 10 and 20
    When I compare them
    Then the result is -1

  Scenario: first greater than second returns 1
    Given numbers 20 and 10
    When I compare them
    Then the result is 1
