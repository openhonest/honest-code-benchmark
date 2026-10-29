Feature: toggle_row
  Flip a single row id in or out of the selection set.

  Scenario: adds an unselected row
    Given an empty selection
    When I toggle row 5
    Then row 5 is selected

  Scenario: removes a selected row
    Given rows 5 and 10 are selected
    When I toggle row 5
    Then only row 10 is selected
