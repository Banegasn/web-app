import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

function app() {
    const firebaseApp = initializeApp({
        credential: cert(JSON.parse(process.env['FIREBASE_CONFIG'] || '{}'))
    });
    const server = express();
    const db = getFirestore(firebaseApp);

    server.use(cors());
    server.use(express.json());

    db.settings({
        ignoreUndefinedProperties: true
    });

    // Realtime endpoint for messages post and get for an AI chat room
    server.get('/api/chat/rooms/:id/messages', async (req, res) => {
        try {
            const { id } = req.params;
            const messagesCollection = db.collection('rooms').doc(id).collection('messages');
            const messagesSnapshot = await messagesCollection.orderBy('timestamp', 'asc').limit(50).get();

            const messages = messagesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            res.json(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    });

    server.post('/api/chat/rooms/:id/messages', async (req, res) => {
        try {
            const { id } = req.params;
            const { text, sender } = req.body || {};

            if (!text || !sender) {
                res.status(400).json({ error: 'Text and sender are required' });
                return;
            }

            const message = {
                text,
                sender,
                timestamp: new Date()
            };

            const messageRef = await db.collection('rooms').doc(id).collection('messages').add(message);
            const savedMessage = await messageRef.get();

            res.json({
                id: savedMessage.id,
                ...savedMessage.data()
            });
        } catch (error) {
            console.error('Error creating message:', error);
            res.status(500).json({ error: 'Failed to create message' });
        }
    });


    server.get('/api/chat/rooms', async (_req, res) => {
        try {
            console.log('Fetching rooms');

            const roomsCollection = db.collection('rooms');
            const roomsSnapshot = await roomsCollection.get();

            const rooms = roomsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            res.json(rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            res.status(500).json({ error: 'Failed to fetch rooms' });
        }
    });

    server.get('/api/chat/rooms/:id', async (req, res) => {
        const { id } = req.params;
        const room = await db.collection('rooms').doc(id).get();
        res.json(room.data());
    });

    server.post('/api/chat/rooms', async (req, res) => {
        console.log('Creating room', req.body);
        const { name } = req.body || {};
        const token = crypto.randomUUID();
        const room = await db.collection('rooms').add({ name, token });
        const data = await room.get();
        res.json(data.data());
    });

    server.delete('/api/chat/rooms/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await db.collection('rooms').doc(id).delete();
            await db.collection('rooms').doc(id).collection('messages').get().then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                    doc.ref.delete();
                });
            });
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting room:', error);
            res.status(500).json({ error: 'Failed to delete room' });
        }
    });

    server.post('/api/chat/rooms/:id/join', async (req, res) => {
        const { id } = req.params;
        const { token, email } = req.body || {};
        const room = await db.collection('rooms').doc(id).get();
        const roomData = room.data();
        if (roomData?.['token'] !== token) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        await db.collection('users').add({ roomId: id, token, email });
        res.json(roomData);
    });

    return server;
}

function run(): void {
    const port = process.env['BACKEND_PORT'] || 4000;

    // Start up the Node server
    const server = app();
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

run();
