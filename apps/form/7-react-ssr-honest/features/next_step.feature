Feature: next_step
  Advance to the next step if the current step validates, else return errors.

  Scenario: valid step 1 advances to step 2
    Given valid fields for step 1
    When I call next_step with step 1
    Then the result is 2

  Scenario: invalid step 1 returns errors
    Given fields with firstName blank
    When I call next_step with step 1
    Then the result contains errors for "firstName"

  Scenario: step 3 business with missing company returns errors
    Given business fields with companyName blank
    When I call next_step with step 3
    Then the result contains errors for "companyName"

  Scenario: step 3 individual advances to step 4
    Given individual fields with accountType filled
    When I call next_step with step 3
    Then the result is 4
