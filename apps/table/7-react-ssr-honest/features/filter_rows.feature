Feature: filter_rows
  Keep rows whose name, email or department contains the text.

  Scenario: empty filter text returns all rows
    Given rows with ids 1, 2, 3
    When I filter with text ""
    Then all 3 rows are returned

  Scenario: matches name substring case-insensitively
    Given a row with name "Alice Smith"
    When I filter with text "smith"
    Then the row is included

  Scenario: matches email substring
    Given a row with email "bob@example.com"
    When I filter with text "example"
    Then the row is included

  Scenario: matches department
    Given a row with department "Engineering"
    When I filter with text "engineer"
    Then the row is included

  Scenario: no match excludes the row
    Given a row with name "Alice" and email "a@b.com" and department "Sales"
    When I filter with text "zzz"
    Then the row is excluded
