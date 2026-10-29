Feature: toggle_all_visible
  Select all visible rows if any unselected, else clear all.

  Scenario: selects all when some unselected
    Given row 1 is selected and rows 2, 3 are not
    When I toggle all visible for ids 1, 2, 3
    Then all three rows are selected

  Scenario: deselects all when all selected
    Given rows 1, 2, 3 are all selected
    When I toggle all visible for ids 1, 2, 3
    Then no rows are selected
