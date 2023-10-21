import express from "express";
import { Pool } from "pg";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { log } from "console";

const wrap = (fn: express.RequestHandler): express.RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const errorHandler: express.ErrorRequestHandler = (err, _, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.log(err.response.data);
    console.log(err.response.data.error.errors);

    res.status(err.response.status).json({
        error: { message: err.response.data.error.message },
    });
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

// Dette er selfvfølgelig for testing. Slike strenger skal aldri ligge i kode som committes.
// Om jeg skulle fortsatt her, så ville jeg laget en hjelpefunksjon for generere tokens. Evt. laget det som en middleware.
const ACCESS_TOKEN = "";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

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
        const result = await pool.query("SELECT count(*) from payments");
        console.log(result.rowCount);
        res.status(200).json({ ping: "pong", count: result.rowCount });
    }),
);

// Create new order
api.post(
    "/orders/",
    wrap(async (req, res) => {
        const order = req.body;
        const id = uuidv4();
        console.log("Id:", id);

        // POST to dintero

        const { data } = await axios.post(
            "https://checkout.test.dintero.com/v1/sessions-profile",
            {
                order: {
                    amount: order.amount,
                    currency: order.currency,
                    merchant_reference: "aukstore",
                },
                url: {
                    return_url: `http://localhost:3000/orders/${id}/redirect`,
                },
                profile_id: "default",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                },
            },
        );

        console.log(data);

        // PUT in db

        const dbresult = await pool.query(
            "INSERT INTO payments (id, amount, currency, receipt, status) VALUES ($1, $2, $3, $4, $5)",
            [id, order.amount, order.currency, order.receipt, "PENDING"],
        );
        const insertedRow = dbresult.rows[0]; // this turns out to be undefined.

        // RESPONSE
        const response = {
            id,
            created_at: new Date().toISOString(), // should get returned from db or dintero
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: "DONE",
            links: [
                {
                    rel: "session_link",
                    href: "https://checkout.test.dintero.com/v1/view/3eacc06f-c9e7-4343-adbe-f3bbfa6cc7a9",
                },
            ],
        };

        res.status(200).json(response);
    }),
);

// Update order from payment redirect
api.get(
    "/orders/:id/payment-redirect",
    wrap(async (req, res) => {
        const orderId = req.params.id;
        // Update order in db
        try {
            console.log("Updating order in db", orderId);
            await pool.query("UPDATE payments SET status = $1 WHERE id = $2", [
                "AUTHORIZED",
                orderId,
            ]);
        } catch (e) {
            console.log(e);
            res.status(404).json({ error: "Order not found" });
        }

        res.status(200).json({ message: "Payment successful" });
    }),
);

// Get orders
api.get(
    "/orders/",
    wrap(async (_, res) => {
        const result = await pool.query("SELECT * from payments");
        console.log(result.rows);
        // console.log(result.rows[0]);

        // RESPONSE
        let response: any[] = [];
        for (const row of result.rows) {
            response.push({
                id: row.id,
                created_at: row.created_at,
                amount: row.amount,
                currency: row.currency,
                receipt: row.receipt,
                status: row.status,
            });
        }

        res.status(200).json({ orders: response });
    }),
);

api.use(errorHandler);

export { api };
