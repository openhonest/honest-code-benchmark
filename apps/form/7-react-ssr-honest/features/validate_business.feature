Feature: validate_business
  Check that business accounts have companyName and taxId filled.

  Scenario: business with both fields passes
    Given fields with accountType "business" and companyName "Acme" and taxId "123"
    When I validate business fields
    Then no errors are returned

  Scenario: business missing companyName fails
    Given fields with accountType "business" and companyName blank
    When I validate business fields
    Then errors include "companyName"

  Scenario: business missing taxId fails
    Given fields with accountType "business" and taxId blank
    When I validate business fields
    Then errors include "taxId"

  Scenario: individual account skips business validation
    Given fields with accountType "individual"
    When I validate business fields
    Then no errors are returned
