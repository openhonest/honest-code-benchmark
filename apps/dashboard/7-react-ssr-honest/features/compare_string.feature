Feature: compare_string
  Locale-aware string comparison returning -1, 0 or 1.

  Scenario: equal strings return 0
    Given strings "apple" and "apple"
    When I compare them
    Then the result is 0

  Scenario: first string comes before second returns -1
    Given strings "apple" and "banana"
    When I compare them
    Then the result is -1

  Scenario: first string comes after second returns 1
    Given strings "banana" and "apple"
    When I compare them
    Then the result is 1
