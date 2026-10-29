Feature: update_field
  Return a new fields object with one field value replaced.

  Scenario: update a single field
    Given fields with firstName "Alice"
    When I update firstName to "Bob"
    Then the new fields have firstName "Bob"

  Scenario: other fields remain unchanged
    Given fields with firstName "Alice" and lastName "Smith"
    When I update firstName to "Bob"
    Then the new fields have lastName "Smith"

  Scenario: original fields are not mutated
    Given fields with email "a@b.com"
    When I update email to "c@d.com"
    Then the original fields still have email "a@b.com"
