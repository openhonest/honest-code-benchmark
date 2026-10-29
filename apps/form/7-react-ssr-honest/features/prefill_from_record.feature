Feature: prefill_from_record
  Extract form field values from a data record, defaulting missing fields.

  Scenario: full record maps all fields
    Given a record with firstName "Alice" and lastName "Smith"
    When I prefill from the record
    Then fields.firstName is "Alice"
    And fields.lastName is "Smith"

  Scenario: missing fields default to empty strings
    Given a record with only firstName "Bob"
    When I prefill from the record
    Then fields.lastName is ""
    And fields.email is ""

  Scenario: missing accountType defaults to individual
    Given a record with no accountType
    When I prefill from the record
    Then fields.accountType is "individual"

  Scenario: all fields absent returns empty form
    Given an empty record
    When I prefill from the record
    Then every field is its default value
