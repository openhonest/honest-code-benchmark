Feature: filter_by_category
  Keep rows matching the given category or return all if "All".

  Scenario: "All" returns every row
    Given rows with categories "Electronics", "Clothing", "Food"
    When I filter by category "All"
    Then all 3 rows are returned

  Scenario: matching category keeps only those rows
    Given rows with categories "Electronics", "Clothing", "Electronics"
    When I filter by category "Electronics"
    Then 2 rows are returned and each has category "Electronics"

  Scenario: no rows match the category
    Given rows with categories "Electronics", "Clothing"
    When I filter by category "Food"
    Then 0 rows are returned

  Scenario: category match is exact not substring
    Given a row with category "Electronics"
    When I filter by category "Electro"
    Then 0 rows are returned
