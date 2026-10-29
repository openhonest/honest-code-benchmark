Feature: compare_boolean
  Boolean comparison with false before true.

  Scenario: both false returns 0
    Given booleans false and false
    When I compare them
    Then the result is 0

  Scenario: both true returns 0
    Given booleans true and true
    When I compare them
    Then the result is 0

  Scenario: false before true returns negative
    Given booleans false and true
    When I compare them
    Then the result is -1

  Scenario: true before false returns positive
    Given booleans true and false
    When I compare them
    Then the result is 1
