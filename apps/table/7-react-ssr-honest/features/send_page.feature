Feature: send_page
  Send the rendered HTML page with timing headers.

  Scenario: sends HTML with Server-Timing header
    Given an HTML string and renderMs of 12.5
    When I send the page
    Then the response Content-Type is "text/html"
    And the Server-Timing header contains "render;dur=12.5"

  Scenario: sends COOP and COEP headers
    Given an HTML string and renderMs of 5.0
    When I send the page
    Then the response has Cross-Origin-Opener-Policy "same-origin"
    And the response has Cross-Origin-Embedder-Policy "require-corp"
