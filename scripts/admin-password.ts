import { createInterface } from 'node:readline';
import { passwordHash } from '../server/admin-auth';
// Read via stdin so the password never becomes a command-line argument.
const input = createInterface({ input: process.stdin });
input.once('line', (password) => {
    if (password.length < 12 || password.length > 256) {
        console.error('Use a password between 12 and 256 characters.');
        process.exitCode = 1;
    } else console.log(passwordHash(password));
    input.close();
});
