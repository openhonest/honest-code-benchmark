Feature: load_data
  Read the JSON data file from disk.

  Scenario: reads a valid JSON file
    Given a file at "data/table-1000.json" containing 1000 row objects
    When I load the data
    Then the result is a list of 1000 Row records

  Scenario: missing file returns a fault
    Given no file at the path
    When I load the data
    Then the result is a Fault with reason "data file not found"
