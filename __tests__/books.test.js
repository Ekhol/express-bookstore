process.env.NODE_ENV = "test"

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let test_isbn;

beforeEach(async () => {
    let result = await db.query(
        `INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)
        VALUES('123456789',
        'https://amazon.com/test',
        'Test',
        'French',
        6,
        'Self',
        'Book name',
        2022)
        RETURNING isbn`
    );

    test_isbn = result.rows[0].isbn
});

describe("GET /books", function () {
    test("Gets a list of books", async function () {
        const response = await request(app).get(`/books`);
        const books = response.body.books;
        expect(books).toHaveLength(1);
        expect(books[0]).toHaveProperty("isbn");
    });
});

describe("POST /books", function () {
    test("Submits a new book", async function () {
        const response = await request(app).post(`.books`).send({
            isbn: '987654321',
            amazon_url: "https://google.com",
            author: "Test",
            language: "Testing",
            pages: 23,
            publisher: "None",
            title: "This isn't real",
            year: 2022
        });
        expect(response.statusCode).toBe(201);
        expect(response.body.book).toHaveProperty("isbn");
    });
    test("Stops submission without required items", async function () {
        const response = await request(app).post(`/books`).send({ pages: 4 });
        expect(response.statusCode).toBe(400);
    });
});

describe("GET /books/:isbn", function () {
    test("Gets one book", async function () {
        const response = await request(app).get(`/books/${test_isbn}`)
        expect(response.body.book).toHaveProperty("isbn");
        expect(response.body.book.isbn).toBe(test_isbn);
    });

    test("404 if book is not found", async function () {
        const response = await request(app).get(`/books/0`)
        expect(response.statusCode).toBe(404);
    });
});

describe("PUT /books/:isbn", function () {
    test("Updates book info", async function () {
        const response = await request(app).put(`/books/${test_isbn}`).send({
            amazon_url: "https://google.com",
            author: "Test",
            language: "Test",
            pages: 1234,
            publisher: "Test",
            title: "Update Test",
            year: 6
        });
        expect(response.body.book).toHaveProperty("isbn");
        expect(response.body.book.year).toBe(6);
    });
    test("Doesn't allow non-listed data", async function () {
        const response = await request(app).put(`/books/${test_isbn}`).send({
            amazon_url: "https://google.com",
            broken: "Test",
            language: "Test",
            pages: 1234,
            publisher: "Test",
            title: "Update Test",
            year: 6
        });
        expect(response.statusCode).toBe(400);
    });
    test("404 if book is not found", async function () {
        const response = await request(app).put(`/books/0`).send({
            amazon_url: "https://google.com",
            broken: "Test",
            language: "Test",
            pages: 1234,
            publisher: "Test",
            title: "Update Test",
            year: 6
        });
        expect(response.statusCode).toBe(404);
    });
});

describe("DELETE /books/:isbn", function () {
    test("Deletes book by isbn", async function () {
        const response = request(app).delete(`/books/${test_isbn}`)
        expect(response.body).toEqual({ message: "Book deleted" });
    });
});

afterEach(async function () {
    await db.query("DELETE FROM BOOKS");
});

afterAll(async function () {
    await db.end()
});