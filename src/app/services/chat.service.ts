import { httpResource } from '@angular/common/http';
import { Injectable, Signal, signal } from '@angular/core';
import { environment } from '../../environments/environment';

interface Room {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
    isPrivate: boolean;
    createdBy: string;
}

interface Message {
    sender: string;
    text: string;
    timestamp: Date;
}

interface User {
    id: string;
    name: string;
    email: string;
    isOnline: boolean;
    lastSeen: Date;
    roomId: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {

    readonly #baseUrl = `${environment.apiUrl}/api`;
    readonly #room = signal<Room | null>(null);
    readonly #currentUser = signal<User | null>(null);
    readonly #users = signal<User[]>([]);

    readonly rooms = httpResource<Room[]>(() => ({
        url: `${this.#baseUrl}/chat/rooms`,
        method: 'GET'
    }));

    readonly createRoom = (name: string, isPrivate = true) => fetch(`${this.#baseUrl}/chat/rooms`, {
        method: 'POST',
        body: JSON.stringify({ name, isPrivate }),
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

    get currentUser(): Signal<User | null> {
        return this.#currentUser.asReadonly();
    }

    get users(): Signal<User[]> {
        return this.#users.asReadonly();
    }

    readonly joinRoom = (roomId: string, token: string, userName: string, userEmail: string) =>
        fetch(`${this.#baseUrl}/chat/rooms/${roomId}/join`, {
            method: 'POST',
            body: JSON.stringify({ token, userName, userEmail }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => response.json());

    readonly getRoomUsers = (roomId: string) =>
        fetch(`${this.#baseUrl}/chat/rooms/${roomId}/users`)
            .then(response => response.json())
            .then(users => {
                this.#users.set(users);
                return users;
            });

    readonly updateUserPresence = (roomId: string, userId: string, isOnline: boolean) =>
        fetch(`${this.#baseUrl}/chat/rooms/${roomId}/users/${userId}/presence`, {
            method: 'PUT',
            body: JSON.stringify({ isOnline }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

    readonly getRoomByToken = (token: string) =>
        fetch(`${this.#baseUrl}/chat/rooms/token/${token}`)
            .then(response => response.json());

    generateRoomLink(room: Room): string {
        return `${window.location.origin}/chat/join/${room.token}`;
    }

    setCurrentUser(user: User) {
        this.#currentUser.set(user);
    }
}