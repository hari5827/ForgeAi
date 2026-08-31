import express from "express";
import morgan from "morgan";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});

const proxy = createProxyMiddleware({
    changeOrigin: false,
    ws: true,

    router: (req) => {
        const host = req.headers.host;

        if (!host) {
            return null;
        }

        const hostname = host.split(":")[0];
        const sandboxId = hostname.split(".")[0];

        const target = `http://sandbox-service-${sandboxId}:5173`;

        console.log("Host:", host);
        console.log("Sandbox ID:", sandboxId);
        console.log("Target:", target);

        return target;
    },
});

app.use(proxy);

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
    proxy.upgrade(req, socket, head);
});

server.listen(3000, () => {
    console.log("Sandbox router running on port 3000");
});