Feature: compute_totals
  Aggregate q1 q2 q3 q4 totals and variance for all given rows.

  Scenario: aggregates two rows
    Given row A with q1=100, q2=200, q3=300, q4=400, budgetTarget=900
    And row B with q1=50, q2=60, q3=70, q4=80, budgetTarget=300
    When I compute totals
    Then q1=150, q2=260, q3=370, q4=480, total=1260, budgetTarget=1200, variance=60

  Scenario: single row
    Given a row with q1=10, q2=20, q3=30, q4=40, budgetTarget=120
    When I compute totals
    Then total=100, variance=-20

  Scenario: empty list
    Given no rows
    When I compute totals
    Then all fields are 0

  Scenario: negative variance aggregate
    Given rows that sum to total=500 and budgetTarget=800
    When I compute totals
    Then variance=-300
