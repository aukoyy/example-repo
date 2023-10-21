import express from "express";
import { Pool } from "pg";

const wrap = (fn: express.RequestHandler): express.RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const errorHandler: express.ErrorRequestHandler = (err, _, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: { message: "server error" } });
};

const simpleRequestLogger: express.RequestHandler = (req, res, next) => {
    const defaultEnd = res.end;
    (res as any).end = (...args: any) => {
        defaultEnd.apply(res, args);
        console.log(
            new Date().toISOString(),
            req.method,
            req.url,
            res.statusCode,
        );
    };
    next();
};

/* const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
}); */

// async function connectToDB() {
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "orders",
    password: "pass",
    port: 5432,
});

pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});

// console.log(await pool.query("SELECT NOW()"));

const api = express();
api.use(express.json());
api.set("port", parseInt(process.env.PORT || "3000"));
api.set("host", process.env.HOST || "0.0.0.0");
api.use(simpleRequestLogger);

api.get(
    "/",
    wrap(async (_, res) => {
        res.status(200).json({ hello: "world" });
    }),
);

api.get(
    "/ping/",
    wrap(async (_, res) => {
        await pool.query("SELECT count(*) from payments");
        res.status(200).json({ ping: "pong" });
    }),
);

// Create new order
api.post(
    "/orders/",
    wrap(async (req, res) => {
        const body = req.body;
        console.log("====================================");
        console.log(body);

        // Now you can access properties of the request body.
        const message = body.message;
        console.log("Message:", message);

        // You should remove the quotes around req.body, as it's a variable.
        res.status(200).json(req.body);
    }),
);

// Update order
// - `GET /orders/{id}/payment-redirect` - Update order from payment redirect
// Update should be patch?

// Get orders
// - `GET /orders` - List orders with current payment status

api.use(errorHandler);

export { api };
