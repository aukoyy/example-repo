import express from "express";
import { Pool } from "pg";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
const dotenv = require("dotenv");
dotenv.config({ path: "../../.env" });
// Det var litt tricky å få dotenv til å fungere. Jeg måtte sette path til .env-filen relativt til dist-mappen.
// Jeg tror ikke det skal være nødvendig.

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

    // Satte errorkoden og meldingen til å flyte gjennom her slik at det var lettere debugge
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

// Satte først ACCESS_TOKEN rett inn her men fjernet det for å ikke legge det ut på github.
// Om du vil teste koden min, så kan du legge det inn her :)
// Om jeg skulle fortsatt her, så ville jeg laget en hjelpefunksjon for generere tokens. Evt. laget det som en middleware.
/* const ACCESS_TOKEN =
    "";
 */

// Jeg brukte relativt lang tid på å få opp en db. Jeg knotet en del med docker først, men fikk det ikke til å fungere.
// Jeg er usikker på om jeg støtte på en veldig sær feil, om det er en en eller annen ressurs fra fleks som "sitter på potta", eller
// det er jeg som bare er litt n00b med docker.
// Jeg endte til slutt opp med å bare lage db og table lokalt i postgres og bruke det.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const api = express();
api.use(express.json());
api.set("port", parseInt(process.env.PORT || "3000"));
api.set("host", process.env.HOST || "0.0.0.0");
api.use(simpleRequestLogger);

// Laget meg en enda enklere ping for å sjekke at serveren kjører selvom det ikke er noen database tilkoblet.
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
        res.status(200).json({
            ping: "pong",
            "Number of orders": Number(result.rows[0].count),
        });
    }),
);

// Create new order
api.post(
    "/orders/",
    wrap(async (req, res) => {
        const order = req.body;
        const id = uuidv4();

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
                    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
                },
            },
        );

        console.log(data);

        // PUT in db
        const dbresult = await pool.query(
            "INSERT INTO payments (id, amount, currency, receipt, status) VALUES ($1, $2, $3, $4, $5)",
            [id, order.amount, order.currency, order.receipt, "PENDING"],
        );

        // Her var tanken å bruke returobjektet fra db insert i responsen, men det ser ikke ut til
        // fungere slik jeg trodde. Det er sikkert ikke så grusomt vanskelig, men valgte å gå videre her.
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
            console.error(e);
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
        // console.log(result.rows);

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
