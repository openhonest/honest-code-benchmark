Feature: validate_step
  Check required fields for a given step number.

  Scenario: step 1 passes with all contact fields filled
    Given fields with firstName, lastName, email and phone filled
    When I validate step 1
    Then no errors are returned

  Scenario: step 1 fails with missing email
    Given fields with email blank
    When I validate step 1
    Then errors include "email"

  Scenario: step 2 fails with missing city
    Given fields with city blank
    When I validate step 2
    Then errors include "city"

  Scenario: step 4 has no required fields
    Given any fields
    When I validate step 4
    Then no errors are returned
