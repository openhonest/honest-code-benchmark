Feature: handle_request
  Parse the HTTP request and extract archetype, arm and row count.

  Scenario: valid request extracts parameters
    Given an HTTP request for path "/table/7-react-ssr-honest/?rows=1000"
    When I handle the request
    Then archetype is "table"
    And arm is "7-react-ssr-honest"
    And rows is 1000

  Scenario: missing rows parameter returns a fault
    Given an HTTP request for path "/table/7-react-ssr-honest/"
    When I handle the request
    Then the result is a Fault with reason "missing rows parameter"
