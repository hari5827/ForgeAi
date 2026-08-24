import express from 'express';
import morgan from 'morgan';
import { createPod } from './kubernetes/pod.js';
import { createService } from './kubernetes/service.js';
import { v7 as uuid } from "uuid";

console.log("APP.JS LOADED");

const app = express();

app.use(morgan('dev'));
app.use(express.json());

console.log("Registering start route");

app.get('/api/sandbox/health', (req, res) => {
    res.status(200).json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

app.post('/api/sandbox/start', async (req, res) => {
    console.log("START ROUTE HIT");

    const sandboxId = uuid();

    await Promise.all([
        createPod(sandboxId),
        createService(sandboxId)
    ]);

    return res.status(200).json({
        message: 'Sandbox created successfully',
        sandboxId,
        previewUrl: `https://${sandboxId}.localhost`,
    });
});

console.log(
    "Routes:",
    app._router?.stack
        ?.filter(layer => layer.route)
        .map(layer => ({
            path: layer.route.path,
            methods: layer.route.methods
        }))
);

export default app;