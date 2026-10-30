# School Database Design

## 1. Tables

* **Students:** Stores student information, including student ID, name, and unique email address.
* **Courses:** Stores course information, including course ID, course name, and description.
* **Enrolments:** Connects students to courses and stores each student's grade.

## 2. Relationships

### One-to-Many Relationships

* One student can have many enrolment records, but each enrolment belongs to one student.
* One course can have many enrolment records, but each enrolment belongs to one course.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship because one student can take several courses, and one course can have many students.

The enrolments table acts as a join table connecting students and courses. It also stores additional information, such as grades. This avoids duplicate data and makes the database easier to manage.

## 3. Index

An index is created on the course ID in the enrolments table:

`CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);`

This index helps the database find enrolments for a particular course faster and improves query performance, especially when retrieving class lists.

## 4. Foreign Key Deletion Rules

The enrolments table uses foreign keys to connect students and courses.

I recommend using **ON DELETE RESTRICT** for both foreign keys.

* If a student has enrolment records, the database will prevent their deletion until those records are handled.
* If a course has enrolment records, the database will prevent its deletion while those records exist.

This approach protects academic history, including student grades, and prevents accidental loss of important information.

Instead of permanently deleting students or courses, the school could mark them as inactive when they are no longer in use.

Foreign key constraints help maintain referential integrity by preventing orphaned enrolment records.

## 5. SQL or NoSQL?

I chose SQL because a school database contains structured information and clear relationships between students, courses, and enrolments.

SQL supports primary keys, foreign keys, unique constraints, and JOIN queries. These features help maintain accurate and consistent data.

SQL transactions also help ensure that related database changes are completed reliably.

SQLite is suitable for this project because it is lightweight, simple to use, and supports relational database operations.
