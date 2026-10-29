Feature: filter_by_search
  Keep rows whose name contains the text as a case-insensitive substring.

  Scenario: empty search text returns all rows
    Given rows with ids 1, 2, 3
    When I search with text ""
    Then all 3 rows are returned

  Scenario: matches name substring case-insensitively
    Given a row with name "Alice Smith"
    When I search with text "smith"
    Then the row is included

  Scenario: no match excludes the row
    Given a row with name "Alice Smith"
    When I search with text "zzz"
    Then the row is excluded

  Scenario: partial match in middle of name
    Given a row with name "Robert Johnson"
    When I search with text "ert jo"
    Then the row is included
