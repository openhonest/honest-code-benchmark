Feature: format_review
  Build label-value pairs for the review step display.

  Scenario: individual account shows basic fields
    Given individual fields with name "Alice Smith" and email "a@b.com"
    When I format for review
    Then the result includes a line with label "Name" and value "Alice Smith"
    And the result includes a line with label "Email"

  Scenario: business account includes company fields
    Given business fields with companyName "Acme" and taxId "123"
    When I format for review
    Then the result includes a line with label "Company"
    And the result includes a line with label "Tax ID"

  Scenario: PO number appears only when filled
    Given business fields with poNumber blank
    When I format for review
    Then the result does not include a line with label "PO Number"

  Scenario: PO number appears when filled
    Given business fields with poNumber "PO-999"
    When I format for review
    Then the result includes a line with label "PO Number" and value "PO-999"
