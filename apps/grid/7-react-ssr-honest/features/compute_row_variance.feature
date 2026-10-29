Feature: compute_row_variance
  Compute total minus budgetTarget for a single row.

  Scenario: positive variance when over budget target
    Given a row with q1=300, q2=300, q3=300, q4=300 and budgetTarget=1000
    When I compute the row variance
    Then the result is 200

  Scenario: negative variance when under budget target
    Given a row with q1=100, q2=100, q3=100, q4=100 and budgetTarget=500
    When I compute the row variance
    Then the result is -100

  Scenario: zero variance when exactly on target
    Given a row with q1=250, q2=250, q3=250, q4=250 and budgetTarget=1000
    When I compute the row variance
    Then the result is 0
