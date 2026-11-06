Feature: format_updated
  Format an ISO timestamp for the dashboard's last-updated line.

  Scenario: formats a UTC timestamp
    Given the timestamp "2026-10-30T19:03:12.345Z"
    When I format it for the last-updated line
    Then the result is "19:03:12 UTC"

  Scenario: an absent timestamp gives an empty string
    Given the timestamp ""
    When I format it for the last-updated line
    Then the result is ""
