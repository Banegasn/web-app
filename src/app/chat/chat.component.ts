import { Dialog } from '@angular/cdk/dialog';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';
import { ChatService } from '../services/chat.service';
import { NewChatDialogComponent } from './new-chat-dialog/new-chat-dialog.component';

interface Room {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [NgClass],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent {
    readonly #chatService = inject(ChatService);
    readonly #dialog = inject(Dialog);

    readonly rooms = this.#chatService.rooms;
    readonly create = this.#chatService.createRoom;
    readonly messages = this.#chatService.messages;
    readonly room = this.#chatService.room;

    readonly loading = computed(() => this.messages.isLoading() || this.rooms.isLoading());

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
                this.create(result).then(() => this.rooms.reload());
            }
        });
    }
} 