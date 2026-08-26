import express from 'express';
import morgan from 'morgan';
import { createPod } from './kubernetes/pod.js';
import { createService } from './kubernetes/service.js';
import { v7 as uuid } from 'uuid';

console.log('APP.JS LOADED');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

console.log('Registering start route');


// Health check
app.get('/api/sandbox/health', (req, res) => {
    res.status(200).json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});


// Create sandbox
app.post('/api/sandbox/start', async (req, res) => {
    console.log('START ROUTE HIT');

    const sandboxId = uuid();

    try {
        // Create Pod
        console.log('Creating pod:', sandboxId);

        await createPod(sandboxId);

        console.log('Pod created successfully:', sandboxId);


        // Create Service
        console.log('Creating service:', sandboxId);

        await createService(sandboxId);

        console.log('Service created successfully:', sandboxId);


        // Send response
        return res.status(200).json({
            message: 'Sandbox created successfully',
            sandboxId,
            previewUrl: `http://${sandboxId}.preview.localhost:3000`
        });

    } catch (error) {
        console.error(
            'SANDBOX CREATION FAILED:',
            error.response?.body || error.message || error
        );

        return res.status(500).json({
            message: 'Failed to create sandbox',
            error: error.response?.body || error.message || 'Unknown error'
        });
    }
});


console.log(
    'Routes:',
    app._router?.stack
        ?.filter(layer => layer.route)
        .map(layer => ({
            path: layer.route.path,
            methods: layer.route.methods
        }))
);


export default app;