Feature: compute_row_total
  Sum q1 q2 q3 q4 for a single row.

  Scenario: sums four quarters
    Given a row with q1=100, q2=200, q3=300, q4=400
    When I compute the row total
    Then the result is 1000

  Scenario: handles zero values
    Given a row with q1=0, q2=0, q3=0, q4=0
    When I compute the row total
    Then the result is 0

  Scenario: handles fractional values
    Given a row with q1=10.50, q2=20.25, q3=30.75, q4=40.00
    When I compute the row total
    Then the result is 101.50
