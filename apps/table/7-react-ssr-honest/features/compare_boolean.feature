Feature: compare_boolean
  Boolean comparison with true before false.

  Scenario: both false returns 0
    Given booleans false and false
    When I compare them
    Then the result is 0

  Scenario: both true returns 0
    Given booleans true and true
    When I compare them
    Then the result is 0

  Scenario: false after true returns positive
    Given booleans false and true
    When I compare them
    Then the result is 1

  Scenario: true before false returns negative
    Given booleans true and false
    When I compare them
    Then the result is -1
