// src/server.ts
import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import { errorHandler } from './_middleware/errorHandler';
import { initialize } from './_helpers/db';
import usersController from './users/user.controller';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(process.cwd(), 'Public')));

// API Routes
app.use('/users', usersController);

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'Public', 'index.html'));
});

// Global Error Handler (must be last)
app.use(errorHandler);

// Start server + initialize database
const PORT = process.env.PORT || 4000;

initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`🔐 Test with: POST /users with { email, password, ... }`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    });