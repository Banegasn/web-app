import { crc32, deflateRawSync } from 'node:zlib';

/** Small ZIP writer for portable archive-validation fixtures (no filesystem extraction). */
export function zipFixture(files: { name: string; data: Buffer | string; attributes?: number; size?: number; deflate?: boolean }[]): Buffer {
    const locals: Buffer[] = [], central: Buffer[] = [];
    let offset = 0;
    for (const file of files) {
        const name = Buffer.from(file.name);
        const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
        const compressed = file.deflate ? deflateRawSync(data) : data;
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x800, 6); local.writeUInt16LE(file.deflate ? 8 : 0, 8);
        local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(file.size ?? data.length, 22); local.writeUInt16LE(name.length, 26);
        const header = Buffer.alloc(46);
        header.writeUInt32LE(0x02014b50); header.writeUInt16LE(0x314, 4); header.writeUInt16LE(20, 6);
        header.writeUInt16LE(0x800, 8); header.writeUInt16LE(file.deflate ? 8 : 0, 10);
        header.writeUInt32LE(crc32(data), 16); header.writeUInt32LE(compressed.length, 20);
        header.writeUInt32LE(file.size ?? data.length, 24); header.writeUInt16LE(name.length, 28);
        header.writeUInt32LE(file.attributes ?? 0, 38); header.writeUInt32LE(offset, 42);
        locals.push(local, name, compressed); central.push(header, name);
        offset += local.length + name.length + compressed.length;
    }
    const directory = Buffer.concat(central), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, directory, end]);
}
