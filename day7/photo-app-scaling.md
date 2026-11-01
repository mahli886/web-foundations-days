# SnapShare – Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view photos shared by people they follow.

The following assumptions are used:

* Total registered users: 10 million.
* Daily active users: 10% of registered users.
* Each active user uploads 1 photo per day.
* Each active user views 50 feed pages per day.
* Average photo size: 2 MB.
* Average thumbnail size: 50 KB.
* One day is approximately 86,400 seconds.
* Traffic is assumed to be evenly distributed throughout the day.
* Photos are stored permanently for the yearly storage estimate.
* Storage estimates exclude backups and additional replicas.

## 2. Traffic and Storage Estimates

### Daily Active Users

10,000,000 × 10% = 1,000,000 daily active users.

### Uploads Per Second

Each active user uploads one photo per day.

1,000,000 uploads ÷ 86,400 seconds = approximately 11.6 uploads per second.

**Estimated uploads: 12 per second.**

### Feed Views Per Second

Each active user views 50 feed pages per day.

1,000,000 × 50 = 50,000,000 feed views per day.

50,000,000 ÷ 86,400 = approximately 579 feed views per second.

**Estimated feed views: 579 per second.**

### Storage Per Year

Each original photo is 2 MB.

1,000,000 × 2 MB = 2,000,000 MB per day.

2,000,000 MB × 365 = 730,000,000 MB per year.

This equals approximately 730 TB of original photos per year.

Each thumbnail is 50 KB.

1,000,000 × 50 KB × 365 = 18,250 GB per year.

This equals approximately 18.25 TB of thumbnails per year.

**Total estimated storage per year:**

730 TB + 18.25 TB = approximately 748.25 TB.

### Summary Table

| Metric                          |   Estimate |
| ------------------------------- | ---------: |
| Registered users                | 10 million |
| Daily active users              |  1 million |
| Photo uploads per second        |         12 |
| Feed views per second           |        579 |
| Original photo storage per year |     730 TB |
| Thumbnail storage per year      |   18.25 TB |
| Total storage per year          |  748.25 TB |

## 3. Read-Heavy or Write-Heavy?

SnapShare is a READ-HEAVY system.

Each active user uploads one photo but views 50 feed pages per day.

This means the application handles approximately 50 million feed views compared to 1 million photo uploads daily.

Therefore, the system must be designed to handle many more reads than writes.

Caching, database read replicas, and a CDN will help improve performance and reduce the load on the main database.

## 4. Proposed Architecture Diagram

```text
                 USERS
                   |
                   v
             CDN (Images)
                   |
                   v
             LOAD BALANCER
                   |
          +--------+--------+
          |        |        |
          v        v        v
       APP      APP      APP
      SERVER   SERVER   SERVER
          |        |
          +--------+
               |
       +-------+--------+
       |                |
       v                v
     CACHE          DATABASE
    (Redis)             |
                   +----+----+
                   |         |
                   v         v
                PRIMARY   READ REPLICA
                DATABASE  DATABASE

APP SERVER
    |
    v
OBJECT STORAGE
(Original Photos)
    |
    v
   QUEUE
    |
    v
 THUMBNAIL WORKER
    |
    v
OBJECT STORAGE
(Thumbnails)
```

## 5. Components and Their Purposes

1. **CDN (Content Delivery Network):** Delivers images and thumbnails from servers close to users, reducing loading time.

2. **Load Balancer:** Distributes incoming requests across multiple app servers to prevent one server from becoming overloaded.

3. **App Servers:** Handle user requests, authentication, photo uploads, and feed generation.

4. **Cache (Redis):** Stores frequently accessed feed data to reduce repeated database queries and improve response times.

5. **Database:** Stores user information, photo details, captions, and relationships between followers.

6. **Read Replica:** Handles database read requests separately from the primary database, reducing pressure on the main database.

7. **Object Storage:** Stores original uploaded photos and generated thumbnails without filling up the application server's disk.

8. **Queue:** Holds thumbnail-generation jobs so photo uploads do not have to wait for image processing.

9. **Thumbnail Worker:** Processes queued jobs in the background, creates smaller versions of uploaded photos, and saves them in object storage.

## 6. Step-by-Step Photo Upload Flow

1. A user selects a photo and uploads it through the SnapShare application.

2. The request reaches the load balancer.

3. The load balancer forwards the request to an available app server.

4. The app server validates the user and checks the uploaded photo.

5. The original photo is saved in object storage.

6. The app server saves the photo information and its storage location in the primary database.

7. A thumbnail-generation job is added to the queue.

8. The app server responds to the user that the photo has been uploaded successfully.

9. The thumbnail worker retrieves the job from the queue.

10. The worker creates a smaller 50 KB thumbnail.

11. The thumbnail is saved in object storage.

12. The photo and thumbnail become available through the CDN for users to view.

## 7. Scaling Trade-Offs

### Trade-Off 1: Caching

**Advantages:**

* Reduces database queries.
* Makes frequently viewed feeds load faster.
* Improves application performance.

**Disadvantages:**

* Cached information can become outdated.
* Cache invalidation adds complexity.

### Trade-Off 2: Database Read Replicas

**Advantages:**

* Distributes read traffic.
* Reduces pressure on the primary database.
* Improves the ability to handle many users.

**Disadvantages:**

* Replicas may have a slight delay before receiving new data.
* Additional replicas increase infrastructure costs.

### Trade-Off 3: Background Processing

**Advantages:**

* Photo uploads can finish faster.
* Thumbnail creation does not block the upload request.
* Workers can process many jobs independently.

**Disadvantages:**

* Thumbnails may not be immediately available.
* Queues and workers require additional monitoring and management.

## 8. Conclusion

SnapShare needs a scalable architecture because it serves millions of users and stores hundreds of terabytes of photos every year.

The system is read-heavy, so CDN delivery, caching, and database read replicas are important for performance.

Object storage provides room for growing photo collections, while queues and background workers allow thumbnails to be generated efficiently.

This architecture helps SnapShare remain reliable, responsive, and scalable as its user base grows.
