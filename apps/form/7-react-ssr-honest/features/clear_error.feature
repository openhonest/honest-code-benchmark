Feature: clear_error
  Remove the error entry for a given field name.

  Scenario: remove an existing error
    Given errors with "email" present
    When I clear the error for "email"
    Then errors do not include "email"

  Scenario: other errors remain
    Given errors with "email" and "phone" present
    When I clear the error for "email"
    Then errors still include "phone"

  Scenario: clearing absent error is a no-op
    Given errors with no entries
    When I clear the error for "email"
    Then errors remain empty
