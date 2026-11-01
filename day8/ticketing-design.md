# TicketHub — Concert and Event Ticketing System Design

## Introduction

TicketHub is an online ticketing platform that allows customers to discover concerts and events, view available seats, reserve multiple seats, make payments, and access their purchased tickets.

The system must support 2 million registered users and handle sudden increases in traffic when popular concerts go on sale.

The main design priorities are speed, reliability, fairness, security, and preventing two customers from purchasing the same seat.

# 1. Requirements

## 1.1 Functional Requirements

TicketHub must allow users to:

1. Register, log in, and manage their accounts.
2. Browse upcoming concerts and events.
3. View event details, including venue, date, time, and ticket prices.
4. View a seating map showing available, held, and sold seats.
5. Select and temporarily reserve multiple available seats.
6. Pay for reserved seats using a supported payment method.
7. Receive confirmation after successful payment.
8. View purchased tickets and previous orders.
9. Cancel eligible orders according to the event cancellation policy.

## 1.2 Non-Functional Requirements

### Performance

* Event pages should load within 2 seconds under normal conditions.
* Seat availability should load within 1 second under normal conditions.
* The system should support approximately 3,500 page requests per second during a major ticket sale, based on the traffic assumptions in Section 2.
* Payment and booking requests should return results without unnecessary delays.

### Correctness and Reliability

* A seat must never be confirmed as sold to two different customers.
* Multiple seats requested in one reservation must be held together or not held at all.
* Failed payments must not result in confirmed bookings.
* Temporary seat reservations must expire automatically.
* Repeated payment requests must not charge customers twice.
* The system should remain available during high-demand events.

### Fairness

* Customers should enter a waiting room during popular ticket sales.
* Customers should be processed in a fair queue.
* Users should not gain an advantage by repeatedly refreshing the page.
* Automated bots and excessive requests should be limited.
* Customers should receive clear information about their queue position and reservation status.

### Security

* User accounts must be protected with secure authentication.
* Users must only access their own orders and tickets.
* Payment information must be handled securely.
* API requests must be authenticated and validated.
* The system should protect against unauthorized access and automated attacks.

# 2. Traffic Estimates

TicketHub has 2 million registered users.

## 2.1 Normal Daily Traffic

Given:

* 50,000 visitors per day.
* Each visitor views 10 pages.
* 5,000 tickets are sold per day.

### Calculate daily page views

50,000 × 10 = 500,000 page views per day.

### Calculate average page requests per second

500,000 ÷ 86,400 = approximately 5.8 requests per second.

### Calculate average ticket sales per second

5,000 ÷ 86,400 = approximately 0.058 sales per second.

Normal traffic is relatively low and predictable.

## 2.2 Popular Concert Sale Traffic

Given:

* 200,000 people attempt to buy tickets.
* 20,000 seats are available.
* The sale takes place within the first 10 minutes.

### Calculate buyer attempts per second

10 minutes = 600 seconds.

200,000 ÷ 600 = approximately 333 buyer attempts per second.

### Calculate successful sales per second

20,000 ÷ 600 = approximately 33 successful sales per second if all seats sell within 10 minutes.

### Estimate page requests during the sale

Assume each of the 200,000 visitors views 10 pages during the sale.

200,000 × 10 = 2,000,000 page views.

2,000,000 ÷ 600 = approximately 3,333 page requests per second.

This is an estimate based on the assumption that every visitor views 10 pages during the 10-minute sale.

## 2.3 Traffic Comparison

| Measurement           |      Normal Day |       Popular Concert Sale |
| --------------------- | --------------: | -------------------------: |
| Visitors              |  50,000 per day |      200,000 in 10 minutes |
| Page views            | 500,000 per day |        2,000,000 estimated |
| Average page requests |  5.8 per second | 3,333 per second estimated |
| Ticket sales          |   5,000 per day | Up to 20,000 in 10 minutes |
| Buyer attempts        |   Not specified |             333 per second |

The estimated page-request rate during the popular concert sale is approximately 576 times the normal daily average.

This sudden increase means TicketHub needs a scalable architecture that can handle high traffic without becoming unavailable or allowing incorrect bookings.

# 3. API Design

TicketHub uses a REST API to support event browsing, seat selection, reservations, payments, and ticket management.

## 3.1 API Endpoints

| HTTP Method | Endpoint                | Purpose                                     |
| ----------- | ----------------------- | ------------------------------------------- |
| GET         | /events                 | Browse available events                     |
| GET         | /events/{eventId}       | View details of one event                   |
| GET         | /events/{eventId}/seats | View the seating map and seat availability  |
| POST        | /orders/holds           | Temporarily reserve multiple seats together |
| POST        | /orders/{orderId}/pay   | Pay for an order                            |
| GET         | /users/me/tickets       | View the logged-in user's tickets           |
| GET         | /orders/{orderId}       | View order details                          |

## 3.2 Batch Seat Reservation

Instead of reserving seats individually, TicketHub uses a batch reservation endpoint.

Endpoint:

POST /orders/holds

Example request:

```json
{
  "event_id": 100,
  "seat_ids": [501, 502, 503]
}
```

The request contains an event ID and an array of seat IDs.

An idempotency key is also sent in the request header to prevent duplicate reservations when customers retry requests.

Example response:

```json
{
  "order_id": 9001,
  "status": "HELD",
  "seat_ids": [501, 502, 503],
  "hold_expires_at": "2026-11-01T18:10:00Z"
}
```

The system attempts to reserve all requested seats in one database transaction.

If every seat is available, all seats are held together.

If even one seat is unavailable, the entire transaction is rolled back and none of the seats are held.

This prevents customers from receiving incomplete or split bookings when purchasing multiple seats.

The temporary hold lasts five minutes. If payment is not completed before expiration, the seats become available again.

## 3.3 Payment Endpoint

Endpoint:

POST /orders/{orderId}/pay

Example response:

```json
{
  "order_id": 9001,
  "payment_status": "SUCCESS",
  "booking_status": "CONFIRMED"
}
```

The payment service processes the transaction and returns the result.

An idempotency key prevents the same payment request from charging a customer more than once.

After successful payment, the system confirms the order and changes the reserved seats from HELD to SOLD.

If payment fails, the order is not confirmed.

# 4. Data Model

TicketHub uses a relational SQL database because ticket bookings require accurate relationships, transactions, and constraints.

The main tables are Users, Events, Seats, Orders, and Order_Items.

## 4.1 Users Table

| Column        | Type            | Description           |
| ------------- | --------------- | --------------------- |
| user_id       | INT PRIMARY KEY | Unique user ID        |
| full_name     | VARCHAR         | Customer's name       |
| email         | VARCHAR UNIQUE  | Customer's email      |
| password_hash | VARCHAR         | Secure password hash  |
| created_at    | TIMESTAMP       | Account creation date |

## 4.2 Events Table

| Column     | Type            | Description           |
| ---------- | --------------- | --------------------- |
| event_id   | INT PRIMARY KEY | Unique event ID       |
| event_name | VARCHAR         | Concert or event name |
| venue      | VARCHAR         | Event location        |
| event_date | TIMESTAMP       | Date and time         |
| status     | VARCHAR         | Event status          |

## 4.3 Seats Table

| Column          | Type            | Description                 |
| --------------- | --------------- | --------------------------- |
| seat_id         | INT PRIMARY KEY | Unique seat ID              |
| event_id        | INT FOREIGN KEY | References Events           |
| seat_number     | VARCHAR         | Seat identification         |
| price           | DECIMAL         | Ticket price                |
| status          | VARCHAR         | AVAILABLE, HELD, or SOLD    |
| held_by         | INT FOREIGN KEY | References Users; nullable  |
| hold_order_id   | INT FOREIGN KEY | References Orders; nullable |
| hold_expires_at | TIMESTAMP       | Hold expiration time        |

A unique constraint on (event_id, seat_number) ensures that the same seat number cannot be created twice for one event.

## 4.4 Orders Table

| Column         | Type            | Description                            |
| -------------- | --------------- | -------------------------------------- |
| order_id       | INT PRIMARY KEY | Unique order ID                        |
| user_id        | INT FOREIGN KEY | References Users                       |
| order_date     | TIMESTAMP       | Date of order                          |
| total_amount   | DECIMAL         | Total price                            |
| payment_status | VARCHAR         | PENDING, SUCCESS, or FAILED            |
| order_status   | VARCHAR         | PENDING, HELD, CONFIRMED, or CANCELLED |

## 4.5 Order_Items Table

This table connects orders with the seats purchased in each order.

| Column            | Type            | Description                       |
| ----------------- | --------------- | --------------------------------- |
| order_item_id     | INT PRIMARY KEY | Unique order item ID              |
| order_id          | INT FOREIGN KEY | References Orders                 |
| seat_id           | INT FOREIGN KEY | References Seats                  |
| price_at_purchase | DECIMAL         | Price when the seat was purchased |

A unique constraint on (order_id, seat_id) prevents the same seat from appearing twice in one order.

## 4.6 Table Relationships

* One user can create many orders.
* One event can have many seats.
* One user can temporarily hold multiple seats.
* Each seat belongs to one event.
* One order belongs to one user.
* One order can contain multiple order items.
* Each order item refers to one seat.
* The Seats table is the authoritative record of whether a seat is AVAILABLE, HELD, or SOLD.

## 4.7 Preventing Double-Booking with Atomic Batch Reservations

Preventing two customers from purchasing the same seat is one of the most important requirements of TicketHub.

The system uses an atomic conditional update inside a database transaction.

When a customer requests several seats:

1. The database starts a transaction.
2. It creates a pending order.
3. It locks all requested seat records in a consistent order.
4. It checks whether every requested seat exists and is AVAILABLE or has an expired hold.
5. If all seats are available, it updates all of them to HELD.
6. It records the customer, order ID, and hold expiration time.
7. It creates the corresponding order items.
8. The transaction commits.
9. If even one seat is unavailable, the entire transaction rolls back.

### Example SQL Using PostgreSQL

The following example demonstrates the batch reservation process.

```sql
BEGIN;

-- Step 1: Lock all requested seat records.
-- Locking in seat_id order helps reduce deadlocks.

SELECT seat_id, status, hold_expires_at
FROM seats
WHERE event_id = 100
  AND seat_id IN (501, 502, 503)
ORDER BY seat_id
FOR UPDATE;

-- Step 2: The application checks that:
-- All three requested seats exist.
-- Every seat is AVAILABLE or has an expired hold.
--
-- If any condition fails, execute ROLLBACK.
-- Otherwise, continue.

-- Step 3: Hold all requested seats together.

UPDATE seats
SET status = 'HELD',
    held_by = 101,
    hold_order_id = 9001,
    hold_expires_at =
        CURRENT_TIMESTAMP + INTERVAL '5 minutes'
WHERE event_id = 100
  AND seat_id IN (501, 502, 503)
  AND (
      status = 'AVAILABLE'
      OR (
          status = 'HELD'
          AND hold_expires_at < CURRENT_TIMESTAMP
      )
  );

-- Step 4: The application checks that exactly
-- three rows were updated.
--
-- If fewer than three rows were updated,
-- execute ROLLBACK.
--
-- If all three were updated, insert the order items.

INSERT INTO order_items (
    order_id,
    seat_id,
    price_at_purchase
)
VALUES
    (9001, 501, 100.00),
    (9001, 502, 100.00),
    (9001, 503, 100.00);

-- Commit only after every requested seat
-- has been successfully held and recorded.

COMMIT;
```

**Important:** The application must execute the checks inside the same transaction. If the number of existing or successfully updated seats is not equal to the number requested, it must execute ROLLBACK instead of COMMIT.

The database locks prevent competing transactions from successfully changing the same seat at the same time. The conditional update ensures that a seat is only held when it is available or its previous hold has expired.

When payment succeeds, another transaction checks that the seats still belong to the same order and that the hold has not expired. It then changes the seats from HELD to SOLD and marks the order as CONFIRMED.

If payment fails or the hold expires, the order is not confirmed and the seats can be released.

**The key principle:** Database transactions, row locking, and conditional updates provide the actual protection against double-booking. A cache or waiting room alone cannot guarantee that two people will not buy the same seat.

# 5. System Architecture

## 5.1 Architecture Diagram

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
           +---------+---------+
           |         |         |
           v         v         v
        APP 1      APP 2     APP 3
           |         |         |
           +---------+---------+
                     |
             +-------+-------+
             |               |
             v               v
         REDIS CACHE     SQL DATABASE
                             |
                       +-----+------+
                       |            |
                       v            v
                  READ REPLICA  PRIMARY DB
                                    |
                                    v
                              PAYMENT SERVICE
                                    |
                                    v
                            BACKGROUND WORKER
```

## 5.2 Component Explanation

### DNS Service

Directs customers to the TicketHub website.

### CDN

Delivers static content such as images, CSS, and JavaScript from locations closer to customers.

### Redis Cache

Stores frequently requested event information and suitable seat-map data to reduce repeated database reads.

Seat availability must be checked against the authoritative database before a booking is confirmed.

### Waiting Room

Controls how many customers enter the ticket-buying system at once.

It uses a fair queue to reduce overload and prevent users from gaining an unfair advantage by repeatedly refreshing the website.

### Load Balancer

Distributes incoming requests across multiple application servers.

### Application Servers

Handle event browsing, seat reservations, orders, authentication, and ticket requests.

Multiple application servers allow horizontal scaling.

### SQL Database

Stores users, events, seats, and orders.

The primary database handles booking transactions. A read replica can handle suitable read-only queries.

### Payment Service

Processes payments securely and reports payment results.

### Background Worker

Handles tasks such as releasing expired seat holds, sending confirmations, and processing other non-urgent jobs.

## 5.3 How the Architecture Survives a Big Sale

TicketHub uses several strategies to survive the sudden increase in traffic:

1. **Waiting room:** Controls incoming traffic before it reaches the application servers.
2. **Horizontal scaling:** Additional application servers can be added when demand increases.
3. **Load balancing:** Distributes requests across available servers.
4. **CDN:** Serves static content without repeatedly contacting application servers.
5. **Redis caching:** Reduces repeated database reads.
6. **Read replicas:** Handle suitable browsing queries and reduce pressure on the primary database.
7. **Database transactions:** Protect seat reservations and prevent double-booking.
8. **Background workers:** Process non-urgent tasks outside the main customer request.
9. **Monitoring and alerts:** Help identify failures and overloaded components.

The waiting room should admit customers at a rate that the database and payment system can safely support.

# 6. Trade-offs

## Trade-off 1: SQL Database vs NoSQL Database

**Chosen: SQL database.**

Advantages:

* Supports database transactions.
* Enforces relationships and constraints.
* Helps prevent double-booking.
* Provides reliable order and payment records.

Disadvantages:

* Requires careful scaling and database management.
* Very high write traffic can create database bottlenecks.

SQL is chosen because accurate ticket allocation is more important than accepting conflicting bookings.

## Trade-off 2: Waiting Room vs Direct Access

**Chosen: Waiting room during high-demand sales.**

Advantages:

* Controls sudden traffic increases.
* Gives customers a fairer, ordered opportunity to purchase tickets.
* Protects application servers and the database from overload.

Disadvantages:

* Customers may wait before entering the website.
* Queue management adds complexity.
* Customers may become frustrated if waiting times are long.

The waiting room is worth the trade-off because it improves stability and fairness during popular sales.

## Trade-off 3: Strong Consistency vs Faster Cached Reads

**Chosen: Strong database consistency for seat booking, with caching for suitable browsing information.**

Advantages:

* Prevents conflicting seat purchases.
* Makes the database the final authority for seat availability.
* Allows event information to load quickly from cache.

Disadvantages:

* Booking operations may be slower than simple cached reads.
* Cache updates and expiration require careful management.

The system prioritizes booking correctness over maximum speed when customers are purchasing seats.

# Conclusion

TicketHub is designed to support 2 million registered users and handle sudden demand during popular concert sales.

Its architecture combines a waiting room, load balancing, caching, multiple application servers, and a relational database.

The most important design decision is protecting seat allocation through atomic database transactions, row locking, and conditional updates.

Batch reservations ensure that customers receive all the seats they requested or none of them. This prevents incomplete bookings and protects customers from double-booking, even when thousands of people attempt to purchase tickets simultaneously.
