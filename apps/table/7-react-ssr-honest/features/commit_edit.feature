Feature: commit_edit
  Apply an inline edit to one cell of one row.

  Scenario: updates a name field
    Given rows with ids 1 and 2
    When I commit edit id 1 column "name" value "Alicia"
    Then row 1 name is "Alicia" and row 2 is unchanged

  Scenario: updates salary with integer parsing
    Given a row with id 2 and salary 60000
    When I commit edit id 2 column "salary" value "75000"
    Then row 2 salary is 75000

  Scenario: keeps original on non-numeric salary
    Given a row with id 1 and salary 50000
    When I commit edit id 1 column "salary" value "abc"
    Then row 1 salary is still 50000
