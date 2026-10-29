Feature: find_record
  Find a single record by id for the detail panel.

  Scenario: existing id returns the record
    Given rows with ids 1, 2, 3
    When I find record with id 2
    Then the record with id 2 is returned

  Scenario: missing id returns undefined
    Given rows with ids 1, 2, 3
    When I find record with id 99
    Then undefined is returned

  Scenario: null id returns undefined
    Given rows with ids 1, 2, 3
    When I find record with id null
    Then undefined is returned
