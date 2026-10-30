-- Create Students table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Create Courses table
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    description TEXT
);

-- Create Enrolments table
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade REAL,

    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);-- Insert students
INSERT INTO students (name, email)
VALUES
('Amina Hassan', 'amina@example.com'),
('Daniel Smith', 'daniel@example.com'),
('Sara Ahmed', 'sara@example.com'),
('John Peter', 'john@example.com');
-- Insert courses
INSERT INTO courses (course_name, description)
VALUES
('Database Management', 'Introduction to SQL and databases'),
('Web Development', 'HTML, CSS and JavaScript'),
('Data Science', 'Introduction to data analysis');
-- Insert enrolments
INSERT INTO enrolments (student_id, course_id, grade)
VALUES
(1, 1, 85),
(1, 2, 90),
(2, 1, 75),
(3, 2, 88),
(3, 3, 92);
SELECT
    students.name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Amina Hassan';
SELECT
    courses.course_name,
    students.name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE courses.course_name = 'Database Management';
SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS number_of_students
FROM courses
LEFT JOIN enrolments
    ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name;
SELECT
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.student_id = enrolments.student_id
WHERE enrolments.student_id IS NULL;
UPDATE enrolments
SET grade = 95
WHERE student_id = 1 AND course_id = 1;
-- Create an index to speed up course searches
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);