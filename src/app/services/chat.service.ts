import { httpResource } from '@angular/common/http';
import { Injectable, Signal, signal } from '@angular/core';

interface Room {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
}

interface Message {
    sender: string;
    text: string;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {

    readonly #baseUrl = 'http://localhost:4000/api';
    readonly #room = signal<Room | null>(null);

    readonly rooms = httpResource<Room[]>(() => ({
        url: `${this.#baseUrl}/chat/rooms`,
        method: 'GET'
    }));

    readonly createRoom = (name: string) => fetch(`${this.#baseUrl}/chat/rooms`, {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    readonly deleteRoom = (id: string) => fetch(`${this.#baseUrl}/chat/rooms/${id}`, {
        method: 'DELETE'
    }).then(() => {
        this.#room.set(null);
    });

    readonly messages = httpResource<Message[]>(() => {
        const room = this.#room();
        if (room) {
            return {
                url: `${this.#baseUrl}/chat/rooms/${room.id}/messages`,
                method: 'GET'
            };
        }
        return undefined;
    });

    sendMessage(text: string) {
        const room = this.#room();
        if (!room) {
            // Or throw an error, or return a rejected promise
            return Promise.reject('No room selected');
        }

        return fetch(`${this.#baseUrl}/chat/rooms/${room.id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text, sender: 'You' }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    set room(room: Room) {
        this.#room.set(room);
    }

    get room(): Signal<Room | null> {
        return this.#room.asReadonly();
    }
}