Feature: compare_string
  Locale-aware string comparison returning -1, 0 or 1.

  Scenario: a before b
    Given strings "apple" and "banana"
    When I compare them
    Then the result is -1

  Scenario: equal strings
    Given strings "hello" and "hello"
    When I compare them
    Then the result is 0

  Scenario: b before a
    Given strings "zebra" and "apple"
    When I compare them
    Then the result is 1

  Scenario: case-insensitive comparison
    Given strings "Alice" and "alice"
    When I compare them
    Then the result is 0
