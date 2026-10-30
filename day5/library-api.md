# Library REST API Design

This API manages books in a library using REST principles.

## 1. List All Books

* **Method:** GET
* **Path:** `/api/books`
* **Description:** Retrieves a list of all books.
* **Success Status Code:** 200 OK

## 2. Get One Book

* **Method:** GET
* **Path:** `/api/books/42`
* **Description:** Retrieves details of a specific book using its ID.
* **Success Status Code:** 200 OK

## 3. Create a New Book

* **Method:** POST
* **Path:** `/api/books`
* **Description:** Adds a new book to the library.
* **Example Request Body:**

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
}
```

* **Success Status Code:** 201 Created

## 4. Update a Book

* **Method:** PUT
* **Path:** `/api/books/42`
* **Description:** Updates the details of an existing book.
* **Example Request Body:**

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1959
}
```

* **Success Status Code:** 200 OK

## 5. Delete a Book

* **Method:** DELETE
* **Path:** `/api/books/42`
* **Description:** Deletes a specific book using its ID.
* **Success Status Code:** 204 No Content

## 6. List Books by Author

* **Method:** GET
* **Path:** `/api/books?author=Chinua%20Achebe`
* **Description:** Retrieves all books written by a specific author using a query parameter.
* **Success Status Code:** 200 OK

## Error Status Codes

### 400 Bad Request

* **Description:** The request contains invalid or missing information.
* **Example:** A user tries to create a book without providing its title.

### 404 Not Found

* **Description:** The requested resource does not exist.
* **Example:** A user tries to retrieve book ID 999 when that book does not exist.
