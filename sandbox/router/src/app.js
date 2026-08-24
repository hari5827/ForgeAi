import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from "http-proxy-middleware";
import http from 'http';


const app = express();
app.use(morgan('combined'));

app.use((req,res,next) => {})

export default app;