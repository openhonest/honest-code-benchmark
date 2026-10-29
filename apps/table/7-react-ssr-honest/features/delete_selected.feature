Feature: delete_selected
  Remove all rows whose ids are in the selection set.

  Scenario: removes selected rows
    Given rows with ids 1, 2, 3
    And rows 1 and 3 are selected
    When I delete selected
    Then only row 2 remains

  Scenario: returns all when none selected
    Given rows with ids 1, 2, 3
    And no rows are selected
    When I delete selected
    Then all 3 rows remain
