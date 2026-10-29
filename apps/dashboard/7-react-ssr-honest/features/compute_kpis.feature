Feature: compute_kpis
  Compute total orders, revenue, average order value and unique customers.

  Scenario: computes all four KPIs from a set of orders
    Given 3 orders with amounts 100.00, 200.00, 150.00 from customers "Alice", "Bob", "Alice"
    When I compute KPIs
    Then totalOrders is 3 and totalRevenue is 450.00 and avgOrder is 150.00 and uniqueCustomers is 2

  Scenario: empty input gives zeroes
    Given 0 orders
    When I compute KPIs
    Then totalOrders is 0 and totalRevenue is 0 and avgOrder is 0 and uniqueCustomers is 0

  Scenario: single order
    Given 1 order with amount 99.99 from customer "Carol"
    When I compute KPIs
    Then totalOrders is 1 and avgOrder is 99.99 and uniqueCustomers is 1
