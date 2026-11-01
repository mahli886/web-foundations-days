# TicketHub — Concert and Event Ticketing System Design

## 1. Requirements

TicketHub is an online ticketing platform where users can discover events, view available seats, purchase tickets, and manage their orders. The system must support 2 million registered users and handle sudden traffic increases when popular concerts go on sale.

### Functional Requirements

The system must allow users to:

1. Register, log in, and manage their accounts.
2. Browse upcoming concerts and events.
3. View event details, including venue, date, price, and available seats.
4. View a seating map and identify available, held, and sold seats.
5. Select and temporarily hold available seats.
6. Pay for held seats using a supported payment method.
7. Receive confirmation after successful payment.
8. View their purchased tickets and order history.
9. Cancel eligible orders according to the event's cancellation policy.

### Non-Functional Requirements

**Performance**

* Event pages should load within 2 seconds under normal conditions.
* Seat availability should load within 1 second under normal conditions.
* The system should handle at least 3,500 page requests per second during a major sale, based on the traffic assumptions below.
* Payment and booking operations should return a clear result without unnecessary delays.

**Correctness and reliability**

* A seat must never be confirmed as sold to two different customers.
* Payment must be linked to the correct order and seat.
* Failed payments must not result in confirmed bookings.
* Temporary seat holds must expire automatically.
* The system should remain available during high-demand sales.

**Fairness and security**

* Customers should enter a waiting room in a fair queue.
* Users must not be able to bypass the queue by repeatedly refreshing.
* The system should limit automated requests and bot activity.
* Users must only access their own orders and tickets.
* Payment information must be handled securely.

## 2. Traffic Estimates

TicketHub has 2 million registered users.

### Normal Daily Traffic

Given:

* 50,000 visitors per day.
* Each visitor views 10 pages.
* 5,000 tickets are sold per day.

**Page views per day:**

50,000 × 10 = 500,000 page views per day.

**Average page requests per second:**

500,000 ÷ 86,400 = approximately 5.8 requests per second.

**Average ticket sales per second:**

5,000 ÷ 86,400 = approximately 0.058 sales per second.

Normal traffic is relatively low and predictable.

### Popular Concert Sale Traffic

Given:

* 200,000 people attempt to buy tickets.
* 20,000 seats are available.
* The sale takes place within the first 10 minutes.

**Buyer attempts per second:**

200,000 ÷ 600 = approximately 333 attempts per second.

**Maximum successful sales per second if all seats sell within 10 minutes:**

20,000 ÷ 600 = approximately 33 successful sales per second.

For an additional capacity estimate, assume each of the 200,000 visitors views 10 pages during the sale:

200,000 × 10 = 2,000,000 page views.

2,000,000 ÷ 600 = approximately 3,333 page requests per second.

This is an estimate based on the 10-page assumption, not a measured figure.

### Comparison

| Measurement           |      Normal Day |       Popular Concert Sale |
| --------------------- | --------------: | -------------------------: |
| Visitors              |  50,000 per day |      200,000 in 10 minutes |
| Page views            | 500,000 per day |        2,000,000 estimated |
| Average page requests |  5.8 per second | 3,333 per second estimated |
| Ticket sales          |   5,000 per day | Up to 20,000 in 10 minutes |
| Buyer attempts        |   Not specified |             333 per second |

The estimated page-request rate during the sale is about 576 times the normal daily average.

This means TicketHub needs a design that can handle sudden traffic increases rather than relying only on normal-day capacity.

## 3. API Design

TicketHub uses a REST API. The following endpoints support the main customer activities.

| Method | Endpoint                | Purpose                                     |
| ------ | ----------------------- | ------------------------------------------- |
| GET    | /events                 | Browse available events                     |
| GET    | /events/{eventId}       | View details of one event                   |
| GET    | /events/{eventId}/seats | View the event seating map and availability |
| POST   | /seats/{seatId}/hold    | Temporarily hold an available seat          |
| POST   | /orders/{orderId}/pay   | Pay for an order                            |
| GET    | /users/me/tickets       | View the logged-in user's tickets           |
| GET    | /orders/{orderId}       | View order details                          |

### Example: Holding a Seat

Request:

POST /seats/501/hold

The request includes the authenticated user and an idempotency key.

Example response:

{
"seat_id": 501,
"status": "HELD",
"hold_expires_at": "2026-11-01T18:10:00Z"
}

The seat is held temporarily, for example, for five minutes. If payment is not completed before the hold expires, the seat becomes available again.

### Example: Paying for an Order

Request:

POST /orders/9001/pay

Example response:

{
"order_id": 9001,
"payment_status": "SUCCESS",
"booking_status": "CONFIRMED"
}

Payment requests must be idempotent so that repeating the same request does not charge the customer twice.

## 4. Data Model

The system uses a relational SQL database because ticket purchases require accurate relationships and transactions.

### Table 1: Users

| Column        | Type            | Description           |
| ------------- | --------------- | --------------------- |
| user_id       | INT PRIMARY KEY | Unique user ID        |
| full_name     | VARCHAR         | Customer's name       |
| email         | VARCHAR UNIQUE  | Customer's email      |
| password_hash | VARCHAR         | Secure password hash  |
| created_at    | TIMESTAMP       | Account creation date |

### Table 2: Events

| Column     | Type            | Description           |
| ---------- | --------------- | --------------------- |
| event_id   | INT PRIMARY KEY | Unique event ID       |
| event_name | VARCHAR         | Concert or event name |
| venue      | VARCHAR         | Event location        |
| event_date | TIMESTAMP       | Date and time         |
| status     | VARCHAR         | Event status          |

### Table 3: Seats

| Column          | Type            | Description                |
| --------------- | --------------- | -------------------------- |
| seat_id         | INT PRIMARY KEY | Unique seat ID             |
| event_id        | INT FOREIGN KEY | References Events          |
| seat_number     | VARCHAR         | Seat identification        |
| price           | DECIMAL         | Ticket price               |
| status          | VARCHAR         | AVAILABLE, HELD, or SOLD   |
| held_by         | INT FOREIGN KEY | References Users; nullable |
| hold_expires_at | TIMESTAMP       | Hold expiration time       |

A unique constraint on (event_id, seat_number) ensures that a seat number cannot be duplicated for the same event.

### Table 4: Orders

| Column         | Type            | Description                      |
| -------------- | --------------- | -------------------------------- |
| order_id       | INT PRIMARY KEY | Unique order ID                  |
| user_id        | INT FOREIGN KEY | References Users                 |
| order_date     | TIMESTAMP       | Date of order                    |
| total_amount   | DECIMAL         | Total price                      |
| payment_status | VARCHAR         | PENDING, SUCCESS, or FAILED      |
| order_status   | VARCHAR         | PENDING, CONFIRMED, or CANCELLED |

### Relationships

* One user can create many orders.
* One event can have many seats.
* One user can temporarily hold many seats.
* Each seat belongs to one event.
* Each order belongs to one user.
* An order can contain multiple seats, so a production implementation would use an additional Order_Items table to connect orders and seats.

### Preventing Double-Booking

Preventing two people from purchasing the same seat is one of the most important requirements.

TicketHub uses an atomic conditional update inside a database transaction.

When a customer selects a seat:

1. The database starts a transaction.
2. It checks whether the seat is AVAILABLE or whether an existing hold has expired.
3. It updates the seat to HELD only if the seat is still available.
4. The update records the customer and the hold expiration time.
5. The transaction commits.

Example SQL:

```sql
BEGIN;

UPDATE seats
SET status = 'HELD',
    held_by = 101,
    hold_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
WHERE seat_id = 501
  AND (
    status = 'AVAILABLE'
    OR (
      status = 'HELD'
      AND hold_expires_at < CURRENT_TIMESTAMP
    )
  );

COMMIT;
```

The application checks the number of rows updated. If one row was updated, the customer successfully held the seat. If zero rows were updated, another customer already holds or bought it.

When payment succeeds, another transaction confirms the order and changes the seat from HELD to SOLD, provided the hold still belongs to that customer and has not expired.

A unique constraint on the seat allocation in confirmed order items provides an additional database-level safeguard.

**Important:** The database transaction and conditional update provide the actual protection against simultaneous bookings. A cache or waiting room alone cannot guarantee that two people will not buy the same seat.

## 5. System Architecture

### Architecture Diagram

```text
              CUSTOMERS
                  |
                  v
              DNS SERVICE
                  |
                  v
             CDN / CACHE
                  |
                  v
          WAITING ROOM / QUEUE
                  |
                  v
            LOAD BALANCER
                  |
          +-------+-------+
          |       |       |
          v       v       v
       APP 1    APP 2    APP 3
          |       |       |
          +-------+-------+
                  |
          +-------+--------+
          |                |
          v                v
      REDIS CACHE      SQL DATABASE
                           |
                     +-----+------+
                     |            |
                     v            v
                READ REPLICA   PRIMARY DB
                                  |
                                  v
                           PAYMENT SERVICE
                                  |
                                  v
                           BACKGROUND WORKER
```

### Component Explanation

**DNS Service:** Directs customers to the TicketHub website.

**CDN:** Delivers static files such as images, CSS, and JavaScript from locations closer to users.

**Redis Cache:** Stores frequently requested event information and seat-map data to reduce database reads. Seat availability must be checked against the authoritative database before a booking is confirmed.

**Waiting Room:** Controls how many customers enter the ticket-buying system at once. It uses a fair queue to reduce overload and prevent users from gaining an unfair advantage by refreshing.

**Load Balancer:** Distributes incoming requests across multiple application servers.

**Application Servers:** Handle event browsing, seat holds, orders, authentication, and ticket requests. Multiple servers allow horizontal scaling.

**SQL Database:** Stores users, events, seats, and orders. The primary database handles booking transactions. A read replica can handle suitable read-only queries.

**Payment Service:** Processes payments securely and reports payment results.

**Background Worker:** Handles tasks such as releasing expired seat holds, sending confirmations, and processing other non-urgent jobs.

### How the Architecture Survives a Big Sale

* The waiting room controls incoming traffic before it reaches the application servers.
* The load balancer distributes admitted requests across multiple application servers.
* Additional application servers can be added through horizontal scaling.
* The CDN serves static content without repeatedly contacting the application servers.
* Redis reduces repeated database reads.
* The primary SQL database protects seat bookings through transactions and constraints.
* Read replicas help handle browsing traffic.
* Background workers process non-urgent tasks outside the main customer request.
* Monitoring and alerts help the team identify failures and overloaded components.

The waiting room should admit customers at a rate the database and payment system can safely support.

## 6. Trade-offs

### Trade-off 1: SQL Database vs NoSQL Database

**Chosen:** SQL database.

Advantages:

* Supports transactions.
* Enforces relationships and constraints.
* Helps prevent double-booking.
* Provides reliable order and payment records.

Disadvantages:

* Requires careful scaling and database management.
* Very high write traffic can create database bottlenecks.

SQL is chosen because correct ticket allocation is more important than accepting conflicting bookings.

### Trade-off 2: Waiting Room vs Direct Access

**Chosen:** Waiting room during high-demand sales.

Advantages:

* Controls sudden traffic increases.
* Gives customers a fairer, ordered opportunity to purchase.
* Protects application servers and the database from overload.

Disadvantages:

* Customers may wait before entering the website.
* Queue management adds complexity.
* Customers may become frustrated if waiting times are long.

The waiting room is worth the trade-off because it improves stability and fairness during popular sales.

### Trade-off 3: Strong Consistency vs Faster Cached Reads

**Chosen:** Strong database consistency for seat booking, with caching for suitable browsing information.

Advantages:

* Prevents conflicting seat purchases.
* Makes the database the final authority for availability.
* Allows event information to load quickly from cache.

Disadvantages:

* Booking operations may be slower than simple cached reads.
* Cache updates and expiration require careful management.

The system prioritizes booking correctness over maximum speed when customers are purchasing seats.

## Conclusion

TicketHub is designed to support 2 million registered users and handle sudden demand during popular concert sales. Its architecture combines a waiting room, load balancing, caching, multiple application servers, and a relational database.

The most important design decision is protecting seat allocation through atomic database transactions and constraints. This ensures that a seat cannot be confirmed for two different customers, even when thousands of people attempt to purchase tickets at the same time.
