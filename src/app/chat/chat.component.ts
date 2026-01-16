import { Dialog } from '@angular/cdk/dialog';
import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';
import { ChatService } from '../services/chat.service';
import { JoinRoomDialogComponent } from './join-room-dialog/join-room-dialog.component';
import { NewChatDialogComponent } from './new-chat-dialog/new-chat-dialog.component';
import { ShareRoomDialogComponent } from './share-room-dialog/share-room-dialog.component';

interface Room {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
    isPrivate: boolean;
    createdBy: string;
}


@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [NgClass, DatePipe],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
    readonly #chatService = inject(ChatService);
    readonly #dialog = inject(Dialog);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);

    readonly rooms = this.#chatService.rooms;
    readonly create = this.#chatService.createRoom;
    readonly messages = this.#chatService.messages;
    readonly room = this.#chatService.room;
    readonly users = this.#chatService.users;
    readonly currentUser = this.#chatService.currentUser;

    readonly loading = computed(() => this.messages.isLoading() || this.rooms.isLoading());
    readonly onlineUsers = computed(() => this.users().filter(user => user.isOnline));
    readonly offlineUsers = computed(() => this.users().filter(user => !user.isOnline));

    #presenceInterval?: number;

    constructor() {
        // Load users when room changes using effect
        effect(() => {
            const room = this.room();
            if (room) {
                this.loadRoomUsers();
                this.startPresenceUpdates();
            } else {
                this.stopPresenceUpdates();
            }
        });
    }

    sendMessage(input: HTMLInputElement) {
        const text = input.value.trim();
        if (text) {
            this.#chatService.sendMessage(text)?.then(() => {
                this.messages.reload();
                input.value = '';
            });
        }
    }

    deleteRoom(event: MouseEvent, room: Room) {
        event.stopPropagation();
        this.#dialog.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Delete Room',
                message: `Are you sure you want to delete room "${room.name}"?`,
                confirmText: 'Delete'
            }
        }).closed.subscribe(confirmed => {
            if (confirmed) {
                this.#chatService.deleteRoom(room.id).then(() => {
                    this.rooms.reload();
                });
            }
        });
    }

    changeRoom(room: Room) {
        this.#chatService.room = room;
    }

    newRoom() {
        this.#dialog.open<string>(
            NewChatDialogComponent, { width: '400px' }
        ).closed.subscribe(result => {
            if (result) {
                this.create(result, true).then(() => this.rooms.reload());
            }
        });
    }

    shareRoom(room: Room) {
        this.#dialog.open(ShareRoomDialogComponent, {
            width: '500px',
            data: { room }
        });
    }

    joinRoomByToken(token: string) {
        this.#dialog.open<{ userName: string; userEmail: string }>(
            JoinRoomDialogComponent, { width: '400px' }
        ).closed.subscribe(result => {
            if (result) {
                this.#chatService.getRoomByToken(token).then(room => {
                    this.#chatService.joinRoom(room.id, token, result.userName, result.userEmail)
                        .then(response => {
                            this.#chatService.setCurrentUser(response.user);
                            this.#chatService.room = response.room;
                            this.#router.navigate(['/chat']);
                            this.loadRoomUsers();
                        })
                        .catch(error => {
                            console.error('Failed to join room:', error);
                        });
                });
            }
        });
    }

    ngOnInit() {
        // Check if we're joining a room via URL
        this.#route.params.subscribe(params => {
            if (params['token']) {
                this.joinRoomByToken(params['token']);
            }
        });
    }

    ngOnDestroy() {
        this.stopPresenceUpdates();
    }

    private loadRoomUsers() {
        const room = this.room();
        if (room) {
            this.#chatService.getRoomUsers(room.id);
        }
    }

    private startPresenceUpdates() {
        this.stopPresenceUpdates();
        const currentUser = this.currentUser();
        const room = this.room();

        if (currentUser && room) {
            // Update presence every 30 seconds
            this.#presenceInterval = window.setInterval(() => {
                this.#chatService.updateUserPresence(room.id, currentUser.id, true);
            }, 30000);
        }
    }

    private stopPresenceUpdates() {
        if (this.#presenceInterval) {
            clearInterval(this.#presenceInterval);
            this.#presenceInterval = undefined;
        }
    }
} 